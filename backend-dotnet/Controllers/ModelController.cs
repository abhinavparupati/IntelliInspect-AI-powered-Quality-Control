using Microsoft.AspNetCore.Mvc;
using IntelliInspect.Api.Models;
using IntelliInspect.Api.Services;

namespace IntelliInspect.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ModelController : ControllerBase
    {
        private readonly IMLService _mlService;
        private readonly IDatasetService _datasetService;
        private readonly ILogger<ModelController> _logger;

        public ModelController(IMLService mlService, IDatasetService datasetService, ILogger<ModelController> logger)
        {
            _mlService = mlService;
            _datasetService = datasetService;
            _logger = logger;
        }

        [HttpPost("train")]
        public async Task<ActionResult<ModelMetrics>> TrainModel([FromBody] DateRanges dateRanges)
        {
            try
            {
                var datasetPath = await _datasetService.GetDatasetPathAsync();
                
                var trainingRequest = new MLTrainingRequest
                {
                    DateRanges = dateRanges,
                    DatasetPath = datasetPath
                };

                var metrics = await _mlService.TrainModelAsync(trainingRequest);
                return Ok(metrics);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "No dataset available for training");
                return BadRequest("No dataset has been uploaded yet");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error training model");
                return StatusCode(500, "Internal server error while training model");
            }
        }

        [HttpGet("status")]
        public async Task<ActionResult<object>> GetModelStatus()
        {
            try
            {
                var isReady = await _mlService.IsModelReadyAsync();
                return Ok(new { IsReady = isReady });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking model status");
                return StatusCode(500, "Internal server error while checking model status");
            }
        }
    }
}
