using CsvHelper;
using CsvHelper.Configuration;
using IntelliInspect.Api.Models;
using System.Globalization;
using System.Text;

namespace IntelliInspect.Api.Services
{
    public class DatasetService : IDatasetService
    {
        private readonly ILogger<DatasetService> _logger;
        private readonly string _dataPath;
        private string? _processedDatasetPath;
        private DateRanges? _validatedDateRanges;
        private int _simulationRecordCount;
        private DatasetMetadata? _datasetMetadata;

        public DatasetService(ILogger<DatasetService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _dataPath = configuration.GetValue<string>("DataPath") ?? Path.Combine(Directory.GetCurrentDirectory(), "data");
            
            // Ensure data directory exists
            if (!Directory.Exists(_dataPath))
            {
                Directory.CreateDirectory(_dataPath);
            }
        }

        public async Task<DatasetMetadata> ProcessDatasetAsync(IFormFile file)
        {
            try
            {
                _logger.LogInformation("Starting dataset processing for file: {FileName}", file.FileName);

                // Validate file
                if (file == null || file.Length == 0)
                    throw new ArgumentException("File is empty or null");

                if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                    throw new ArgumentException("Only CSV files are supported");

                // Save uploaded file
                var fileName = $"uploaded_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                var uploadPath = Path.Combine(_dataPath, fileName);

                using (var stream = new FileStream(uploadPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Process the dataset
                var metadata = await ProcessCsvFileAsync(uploadPath, file.FileName);
                
                _datasetMetadata = metadata; // Store metadata for validation
                _logger.LogInformation("Dataset processing completed successfully");

                return metadata;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing dataset");
                throw;
            }
        }

        private async Task<DatasetMetadata> ProcessCsvFileAsync(string filePath, string originalFileName)
        {
            using var reader = new StreamReader(filePath);
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            // Read header to get column count
            await csv.ReadAsync();
            csv.ReadHeader();
            var headers = csv.HeaderRecord;
            var numberOfColumns = headers?.Length ?? 0;

            // Check for Response column
            var hasResponseColumn = headers?.Any(h => h.Equals("Response", StringComparison.OrdinalIgnoreCase)) ?? false;
            if (!hasResponseColumn)
                throw new InvalidOperationException("Dataset must contain a 'Response' column");

            var records = new List<Dictionary<string, object>>();
            var passCount = 0;
            var totalRecords = 0;

            // Read all records first to get the total count
            var tempRecords = new List<Dictionary<string, object>>();
            while (await csv.ReadAsync())
            {
                var record = new Dictionary<string, object>();
                
                foreach (var header in headers!)
                {
                    var value = csv.GetField(header);
                    record[header] = value ?? string.Empty;
                }

                // Count pass/fail for Response column
                if (record.TryGetValue("Response", out var responseValue))
                {
                    // In Bosch dataset: 0 = Pass (no defect), 1 = Fail (defect detected)
                    if (responseValue?.ToString() == "0")
                        passCount++;
                }

                tempRecords.Add(record);
                totalRecords++;
            }

            // Now add synthetic timestamps in chronological order (oldest first)
            var baseDate = new DateTime(2024, 1, 1); // Fixed start date for consistency
            for (int i = 0; i < tempRecords.Count; i++)
            {
                var record = tempRecords[i];
                var syntheticTimestamp = baseDate.AddDays(i);
                record["synthetic_timestamp"] = syntheticTimestamp.ToString("yyyy-MM-ddTHH:mm:ssZ");
                records.Add(record);
            }

            // Calculate pass rate as decimal (0-1 range, not percentage)
            var passRate = totalRecords > 0 ? (double)passCount / totalRecords : 0;
            var failCount = totalRecords - passCount;

            // Create processed file with synthetic timestamps
            var processedFileName = $"processed_{Path.GetFileNameWithoutExtension(filePath)}.csv";
            var processedPath = Path.Combine(_dataPath, processedFileName);
            
            await WriteProcessedCsvAsync(processedPath, records, (headers ?? Array.Empty<string>()).Concat(new[] { "synthetic_timestamp" }).ToArray());
            
            _processedDatasetPath = processedPath;

            // Calculate date range from synthetic timestamps 
            var datasetStartDate = new DateTime(2024, 1, 1);
            var datasetEndDate = datasetStartDate.AddDays(totalRecords - 1);

            var metadata = new DatasetMetadata
            {
                RecordCount = totalRecords,
                ColumnCount = numberOfColumns + 1, // +1 for synthetic_timestamp column
                StartDate = datasetStartDate,
                EndDate = datasetEndDate,
                PassRate = passRate,
                PassCount = passCount,
                FailCount = failCount,
                FileName = originalFileName,
                UploadedAt = DateTime.UtcNow
            };

            // Store metadata for validation and retrieval
            _datasetMetadata = metadata;

            return metadata;
        }

        private async Task WriteProcessedCsvAsync(string filePath, List<Dictionary<string, object>> records, string[] headers)
        {
            try
            {
                _logger.LogDebug("Writing processed CSV to: {FilePath} with {RecordCount} records", filePath, records.Count);
                
                // Ensure directory exists
                var directory = Path.GetDirectoryName(filePath);
                if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }
                
                using var writer = new StreamWriter(filePath, false, Encoding.UTF8);
                using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

                // Write headers
                foreach (var header in headers)
                {
                    csv.WriteField(header);
                }
                await csv.NextRecordAsync();

                // Write records
                foreach (var record in records)
                {
                    foreach (var header in headers)
                    {
                        csv.WriteField(record.TryGetValue(header, out var value) ? value : string.Empty);
                    }
                    await csv.NextRecordAsync();
                }
                
                // Ensure all data is written to the file
                await csv.FlushAsync();
                await writer.FlushAsync();
                
                _logger.LogDebug("Successfully wrote CSV file: {FilePath}", filePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to write CSV file: {FilePath}", filePath);
                throw;
            }
        }

        public async Task<ValidationResult> ValidateDateRangesAsync(DateRanges dateRanges)
        {
            await Task.Delay(100); // Simulate async operation

            try
            {
                // Check if dataset metadata is available
                if (_datasetMetadata == null)
                    return new ValidationResult { IsValid = false, Errors = new List<string> { "No dataset has been uploaded yet" } };

                var datasetStartDate = _datasetMetadata.StartDate;
                var datasetEndDate = _datasetMetadata.EndDate;

                var errors = new List<string>();

                // Validate that start dates are before end dates
                if (dateRanges.Training.Start >= dateRanges.Training.End)
                    errors.Add("Training start date must be before end date");

                if (dateRanges.Testing.Start >= dateRanges.Testing.End)
                    errors.Add("Testing start date must be before end date");

                if (dateRanges.Simulation.Start >= dateRanges.Simulation.End)
                    errors.Add("Simulation start date must be before end date");

                // Validate that date ranges are within dataset boundaries
                if (dateRanges.Training.Start < datasetStartDate)
                    errors.Add($"Training start date cannot be before dataset start date ({datasetStartDate:yyyy-MM-dd})");

                if (dateRanges.Simulation.End > datasetEndDate)
                    errors.Add($"Simulation end date cannot be after dataset end date ({datasetEndDate:yyyy-MM-dd})");

                // Validate continuous, non-overlapping sequential order
                if (dateRanges.Training.End != dateRanges.Testing.Start)
                    errors.Add("Testing period must start immediately after training period ends (no gaps or overlaps)");

                if (dateRanges.Testing.End != dateRanges.Simulation.Start)
                    errors.Add("Simulation period must start immediately after testing period ends (no gaps or overlaps)");

                if (errors.Any())
                {
                    return new ValidationResult { IsValid = false, Errors = errors };
                }

                // Calculate simulation record count based on days (since we're using daily increments)
                var simulationDuration = dateRanges.Simulation.End - dateRanges.Simulation.Start;
                _simulationRecordCount = (int)simulationDuration.TotalDays;

                // Store the validated date ranges
                _validatedDateRanges = dateRanges;

                // Calculate data distribution for successful validation
                var dataDistribution = CalculateDataDistribution(dateRanges);

                return new ValidationResult
                {
                    IsValid = true,
                    Message = "Date ranges are valid and continuous",
                    DataDistribution = dataDistribution
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating date ranges");
                return new ValidationResult
                {
                    IsValid = false,
                    Errors = new List<string> { $"Validation error: {ex.Message}" }
                };
            }
        }

        private DataDistribution CalculateDataDistribution(DateRanges dateRanges)
        {
            var distribution = new DataDistribution();

            // Calculate total days for each period
            var trainingDays = (dateRanges.Training.End - dateRanges.Training.Start).Days + 1;
            var testingDays = (dateRanges.Testing.End - dateRanges.Testing.Start).Days + 1;
            var simulationDays = (dateRanges.Simulation.End - dateRanges.Simulation.Start).Days + 1;

            // Since we use one record per day, the record counts equal the day counts
            distribution.TrainingRecords = trainingDays;
            distribution.TestingRecords = testingDays;
            distribution.SimulationRecords = simulationDays;

            // Generate monthly distribution
            distribution.MonthlyDistribution = GenerateMonthlyDistribution(dateRanges);

            return distribution;
        }

        private List<MonthlyData> GenerateMonthlyDistribution(DateRanges dateRanges)
        {
            var monthlyData = new Dictionary<string, MonthlyData>();

            // Helper method to add days to monthly data
            void AddDaysToMonth(DateTime start, DateTime end, string type)
            {
                for (var date = start; date <= end; date = date.AddDays(1))
                {
                    var monthKey = date.ToString("yyyy-MM");
                    var monthName = date.ToString("MMM yyyy");

                    if (!monthlyData.ContainsKey(monthKey))
                    {
                        monthlyData[monthKey] = new MonthlyData
                        {
                            Month = monthKey,
                            MonthName = monthName
                        };
                    }

                    switch (type)
                    {
                        case "training":
                            monthlyData[monthKey].TrainingCount += 1;
                            break;
                        case "testing":
                            monthlyData[monthKey].TestingCount += 1;
                            break;
                        case "simulation":
                            monthlyData[monthKey].SimulationCount += 1;
                            break;
                    }

                    monthlyData[monthKey].TotalCount += 1;
                }
            }

            // Add training period
            AddDaysToMonth(dateRanges.Training.Start, dateRanges.Training.End, "training");
            
            // Add testing period
            AddDaysToMonth(dateRanges.Testing.Start, dateRanges.Testing.End, "testing");
            
            // Add simulation period
            AddDaysToMonth(dateRanges.Simulation.Start, dateRanges.Simulation.End, "simulation");

            // Return sorted by month
            return monthlyData.Values
                .OrderBy(m => m.Month)
                .ToList();
        }

        public async Task<string> GetDatasetPathAsync()
        {
            await Task.Delay(1); // Satisfy async requirement
            if (_processedDatasetPath == null)
                throw new InvalidOperationException("No dataset has been processed yet");
            
            // Ensure we return an absolute path for the ML service
            var absolutePath = Path.IsPathRooted(_processedDatasetPath) 
                ? _processedDatasetPath 
                : Path.GetFullPath(_processedDatasetPath);
            
            _logger.LogInformation("Returning dataset path to ML service: {Path}", absolutePath);
            return absolutePath;
        }

        public DateRanges? GetValidatedDateRanges()
        {
            return _validatedDateRanges;
        }

        public int GetSimulationRecordCount()
        {
            return _simulationRecordCount;
        }

        public DatasetMetadata? GetDatasetMetadata()
        {
            return _datasetMetadata;
        }

        public async Task<List<Dictionary<string, object>>> GetSimulationDataAsync()
        {
            if (string.IsNullOrEmpty(_processedDatasetPath) || _validatedDateRanges == null)
                throw new InvalidOperationException("No processed dataset or validated date ranges available");

            var simulationData = new List<Dictionary<string, object>>();

            _logger.LogDebug("Reading simulation data from file: {FilePath}", _processedDatasetPath);
            
            if (!File.Exists(_processedDatasetPath))
            {
                _logger.LogError("Processed dataset file not found: {FilePath}", _processedDatasetPath);
                throw new FileNotFoundException($"Processed dataset file not found: {_processedDatasetPath}");
            }

            using var reader = new StreamReader(_processedDatasetPath);
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            // Read header
            await csv.ReadAsync();
            csv.ReadHeader();
            var headers = csv.HeaderRecord;
            
            if (headers == null || headers.Length == 0)
            {
                _logger.LogError("No headers found in processed dataset file");
                throw new InvalidOperationException("No headers found in processed dataset file");
            }

            // Read all records and filter by simulation date range
            var recordIndex = 0;
            while (await csv.ReadAsync())
            {
                var record = new Dictionary<string, object>();
                
                foreach (var header in headers)
                {
                    var value = csv.GetField(header);
                    record[header] = value ?? string.Empty;
                }
                
                // Check if this record falls within simulation date range
                if (record.TryGetValue("synthetic_timestamp", out var timestampValue))
                {
                    if (DateTime.TryParse(timestampValue?.ToString(), out var recordDate))
                    {
                        if (recordDate >= _validatedDateRanges.Simulation.Start && 
                            recordDate <= _validatedDateRanges.Simulation.End)
                        {
                            simulationData.Add(record);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("Failed to parse timestamp: {Timestamp} for record {Index}", timestampValue, recordIndex);
                    }
                }
                else
                {
                    _logger.LogWarning("No synthetic_timestamp field found in record {Index}", recordIndex);
                }
                
                recordIndex++;
            }

            _logger.LogInformation("Retrieved {Count} simulation records for date range {Start} to {End}", 
                simulationData.Count, _validatedDateRanges.Simulation.Start, _validatedDateRanges.Simulation.End);

            return simulationData;
        }
    }
}
