using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using IntelliInspect.Api.Models;
using IntelliInspect.Api.Services;
using IntelliInspect.Api.Hubs;

namespace IntelliInspect.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SimulationController : ControllerBase
    {
        private readonly IMLService _mlService;
        private readonly IDatasetService _datasetService;
        private readonly ILogger<SimulationController> _logger;
        private readonly IHubContext<SimulationHub> _hubContext;
        private static SimulationStatus _simulationStatus = new SimulationStatus();
        private static readonly object _lock = new object();

        public SimulationController(IMLService mlService, IDatasetService datasetService, ILogger<SimulationController> logger, IHubContext<SimulationHub> hubContext)
        {
            _mlService = mlService;
            _datasetService = datasetService;
            _logger = logger;
            _hubContext = hubContext;
        }

        [HttpPost("start")]
        public ActionResult StartSimulation()
        {
            try
            {
                // Step 1: Check if dataset is uploaded and processed
                var datasetMetadata = _datasetService.GetDatasetMetadata();
                if (datasetMetadata == null)
                {
                    return BadRequest("Step 1 incomplete: No dataset uploaded. Please upload a dataset first.");
                }

                // Step 2: Check if date ranges are validated
                var dateRanges = _datasetService.GetValidatedDateRanges();
                if (dateRanges == null)
                {
                    return BadRequest("Step 2 incomplete: Date ranges not validated. Please validate date ranges first.");
                }

                // Step 3: Check if model is trained (basic check - could be enhanced)
                var simulationCount = _datasetService.GetSimulationRecordCount();
                if (simulationCount <= 0)
                {
                    return BadRequest("Step 3 incomplete: No valid simulation data found. Please complete model training first.");
                }

                // Additional check: Ensure simulation is not already running
                lock (_lock)
                {
                    if (_simulationStatus.IsRunning)
                    {
                        return BadRequest("Simulation is already running. Please stop the current simulation before starting a new one.");
                    }

                    // Reset and initialize simulation status
                    _simulationStatus = new SimulationStatus
                    {
                        IsRunning = true,
                        TotalPredictions = 0,
                        PassCount = 0,
                        FailCount = 0,
                        AverageConfidence = 0,
                        ExpectedCount = simulationCount
                    };
                }

                _logger.LogInformation("Simulation started with expected count: {SimulationCount}. All prerequisites validated.", simulationCount);
                
                // Start background simulation task
                _ = Task.Run(async () => await RunSimulationAsync(simulationCount));

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting simulation");
                return StatusCode(500, "Internal server error while starting simulation");
            }
        }

        [HttpPost("stop")]
        public ActionResult StopSimulation()
        {
            try
            {
                lock (_lock)
                {
                    _simulationStatus.IsRunning = false;
                }

                _logger.LogInformation("Simulation stopped");
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping simulation");
                return StatusCode(500, "Internal server error while stopping simulation");
            }
        }

        [HttpPost("reset")]
        public ActionResult ResetSimulation()
        {
            try
            {
                lock (_lock)
                {
                    // Completely reset simulation status
                    _simulationStatus = new SimulationStatus
                    {
                        IsRunning = false,
                        TotalPredictions = 0,
                        PassCount = 0,
                        FailCount = 0,
                        AverageConfidence = 0,
                        ExpectedCount = 0
                    };
                }

                _logger.LogInformation("Simulation state reset");
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting simulation");
                return StatusCode(500, "Internal server error while resetting simulation");
            }
        }

        [HttpGet("status")]
        public ActionResult<SimulationStatus> GetSimulationStatus()
        {
            lock (_lock)
            {
                return Ok(_simulationStatus);
            }
        }

        [HttpGet("current-data")]
        public async Task<ActionResult<object>> GetCurrentSimulationData()
        {
            try
            {
                var simulationData = await _datasetService.GetSimulationDataAsync();
                var dateRanges = _datasetService.GetValidatedDateRanges();
                
                if (dateRanges == null)
                    return NotFound("No validated date ranges found");

                return Ok(new
                {
                    TotalRecords = simulationData.Count,
                    DateRange = new
                    {
                        Start = dateRanges.Simulation.Start,
                        End = dateRanges.Simulation.End
                    },
                    SampleData = simulationData.Take(3).Select(record => new
                    {
                        Timestamp = record.TryGetValue("synthetic_timestamp", out var ts) ? ts : null,
                        Features = record.Where(kvp => kvp.Key != "Response" && kvp.Key != "synthetic_timestamp")
                                        .ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                        ActualResponse = record.TryGetValue("Response", out var response) ? response : null
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current simulation data");
                return StatusCode(500, "Internal server error while getting simulation data");
            }
        }

        private async Task RunSimulationAsync(int expectedCount)
        {
            var confidenceSum = 0.0;

            try
            {
                // Get real simulation data from the dataset
                var simulationData = await _datasetService.GetSimulationDataAsync();
                
                if (simulationData.Count == 0)
                {
                    _logger.LogWarning("No simulation data available for the selected date range");
                    lock (_lock)
                    {
                        _simulationStatus.IsRunning = false;
                    }
                    return;
                }

                // Get the simulation start date from validated date ranges
                var dateRanges = _datasetService.GetValidatedDateRanges();
                if (dateRanges == null)
                {
                    _logger.LogError("No validated date ranges available for simulation");
                    lock (_lock)
                    {
                        _simulationStatus.IsRunning = false;
                    }
                    return;
                }

                var currentSimulationDate = dateRanges.Simulation.Start;
                var recordIndex = 0;

                _logger.LogInformation("Starting simulation with {DataCount} real data records, starting from date: {StartDate}", 
                    simulationData.Count, currentSimulationDate);

                foreach (var dataRecord in simulationData.Take(expectedCount))
                {
                    if (!_simulationStatus.IsRunning)
                        break;

                    // Check if any clients are still connected - if not, stop simulation
                    var connectedClients = SimulationHub.GetConnectedClientsCount();
                    if (connectedClients == 0)
                    {
                        _logger.LogInformation("No clients connected. Stopping simulation automatically.");
                        lock (_lock)
                        {
                            _simulationStatus.IsRunning = false;
                        }
                        break;
                    }

                    try
                    {
                        // Extract features from the real data record (exclude Response, synthetic_timestamp, and environmental data)
                        var features = new Dictionary<string, object>();
                        var excludedColumns = new HashSet<string> 
                        { 
                            "Response", 
                            "synthetic_timestamp", 
                            "temperature", 
                            "humidity", 
                            "pressure",
                            "Temperature", 
                            "Humidity", 
                            "Pressure"
                        };

                        foreach (var kvp in dataRecord)
                        {
                            if (!excludedColumns.Contains(kvp.Key))
                            {
                                // Try to parse as double, fallback to string
                                if (double.TryParse(kvp.Value?.ToString(), out var numericValue))
                                {
                                    features[kvp.Key] = numericValue;
                                }
                                else
                                {
                                    features[kvp.Key] = kvp.Value?.ToString() ?? "";
                                }
                            }
                        }

                        // Get the actual response for comparison (optional - for logging/validation)
                        var actualResponse = dataRecord.TryGetValue("Response", out var responseValue) 
                            ? responseValue?.ToString() : "Unknown";

                        // Get the actual sample ID from the dataset (first column, typically "Id")
                        var actualSampleId = "Unknown";
                        
                        // Try to get ID from common ID column names
                        if (dataRecord.TryGetValue("Id", out var idValue) && !string.IsNullOrEmpty(idValue?.ToString()))
                        {
                            actualSampleId = idValue.ToString()!;
                        }
                        else if (dataRecord.TryGetValue("ID", out var idValue2) && !string.IsNullOrEmpty(idValue2?.ToString()))
                        {
                            actualSampleId = idValue2.ToString()!;
                        }
                        else if (dataRecord.TryGetValue("SampleId", out var sampleIdValue) && !string.IsNullOrEmpty(sampleIdValue?.ToString()))
                        {
                            actualSampleId = sampleIdValue.ToString()!;
                        }
                        else
                        {
                            // Fallback to first column if standard ID columns not found
                            var firstColumn = dataRecord.FirstOrDefault();
                            if (!string.IsNullOrEmpty(firstColumn.Value?.ToString()))
                            {
                                actualSampleId = firstColumn.Value.ToString()!;
                            }
                        }

                        // Use incremental simulation date instead of original timestamp
                        var simulationTimestamp = currentSimulationDate.AddDays(recordIndex);

                        // Use the actual sample ID from the dataset
                        var sampleId = actualSampleId;

                        // Make prediction using the ML service
                        var predictionRequest = new MLPredictionRequest { Features = features };
                        var prediction = await _mlService.PredictAsync(predictionRequest);

                        lock (_lock)
                        {
                            _simulationStatus.TotalPredictions++;
                            
                            if (prediction.Prediction == "Pass")
                                _simulationStatus.PassCount++;
                            else
                                _simulationStatus.FailCount++;

                            confidenceSum += prediction.Confidence;
                            _simulationStatus.AverageConfidence = confidenceSum / _simulationStatus.TotalPredictions;
                        }

                        // Create real-time prediction result for frontend
                        var predictionResult = new
                        {
                            sampleId = sampleId, // Sample ID as first column
                            timestamp = simulationTimestamp.ToString("o"), // Use incremental simulation timestamp
                            prediction = prediction.Prediction,
                            confidence = prediction.Confidence,
                            actualResponse = actualResponse,
                            features = features.Where(kvp => !kvp.Key.ToLower().Contains("temperature") && 
                                                           !kvp.Key.ToLower().Contains("humidity") && 
                                                           !kvp.Key.ToLower().Contains("pressure"))
                                              .Take(5)
                                              .ToDictionary(kvp => kvp.Key, kvp => kvp.Value) // Send first 5 non-environmental features
                        };

                        // Push real-time update to all connected clients
                        await _hubContext.Clients.Group("SimulationGroup").SendAsync("PredictionUpdate", predictionResult);
                        
                        // Push status update
                        await _hubContext.Clients.Group("SimulationGroup").SendAsync("StatusUpdate", _simulationStatus);

                        // Log prediction with incremental date and actual sample ID for debugging
                        _logger.LogDebug("Record {Index}: Sample ID {SampleId}, Date {Date}, Prediction: {Prediction} (Confidence: {Confidence:F2}), Actual: {Actual}", 
                            recordIndex + 1, sampleId, simulationTimestamp.ToString("yyyy-MM-dd"), prediction.Prediction, prediction.Confidence, actualResponse);

                        recordIndex++; // Increment for next day

                        // Wait 1 second before next prediction to simulate real-time processing
                        await Task.Delay(1000);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing simulation record {RecordIndex}", recordIndex);
                        recordIndex++; // Still increment on error to maintain date progression
                        await Task.Delay(1000); // Continue after error
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting simulation data");
            }

            // Automatically stop simulation when completed
            lock (_lock)
            {
                _simulationStatus.IsRunning = false;
            }

            _logger.LogInformation("Simulation completed. Total predictions: {TotalPredictions}, Expected: {ExpectedCount}", 
                _simulationStatus.TotalPredictions, expectedCount);
        }
    }
}
