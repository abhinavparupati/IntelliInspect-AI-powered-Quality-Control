using Microsoft.AspNetCore.Mvc;
using IntelliInspect.Api.Models;
using IntelliInspect.Api.Services;

namespace IntelliInspect.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatasetController : ControllerBase
    {
        private readonly IDatasetService _datasetService;
        private readonly ILogger<DatasetController> _logger;

        public DatasetController(IDatasetService datasetService, ILogger<DatasetController> logger)
        {
            _datasetService = datasetService;
            _logger = logger;
        }

        [HttpPost("upload")]
        public async Task<ActionResult<DatasetMetadata>> UploadDataset(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest("No file uploaded");
                }

                var metadata = await _datasetService.ProcessDatasetAsync(file);
                return Ok(metadata);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid file upload request");
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing dataset upload");
                return StatusCode(500, "Internal server error while processing dataset");
            }
        }

        [HttpPost("validate-ranges")]
        public async Task<ActionResult<ValidationResult>> ValidateRanges([FromBody] DateRanges dateRanges)
        {
            try
            {
                var result = await _datasetService.ValidateDateRangesAsync(dateRanges);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating date ranges");
                return StatusCode(500, "Internal server error while validating date ranges");
            }
        }

        [HttpGet("metadata")]
        public ActionResult<DatasetMetadata> GetDatasetMetadata()
        {
            try
            {
                var metadata = _datasetService.GetDatasetMetadata();
                if (metadata == null)
                {
                    return NotFound("No dataset has been uploaded yet");
                }
                return Ok(metadata);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dataset metadata");
                return StatusCode(500, "Internal server error while getting dataset metadata");
            }
        }

        [HttpGet("validated-ranges")]
        public ActionResult<DateRanges> GetValidatedDateRanges()
        {
            try
            {
                var dateRanges = _datasetService.GetValidatedDateRanges();
                if (dateRanges == null)
                {
                    return NotFound("No validated date ranges found. Please validate date ranges first.");
                }
                return Ok(dateRanges);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting validated date ranges");
                return StatusCode(500, "Internal server error while getting validated date ranges");
            }
        }
    }
}
