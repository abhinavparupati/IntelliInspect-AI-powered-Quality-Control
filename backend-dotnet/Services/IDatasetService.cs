using IntelliInspect.Api.Models;

namespace IntelliInspect.Api.Services
{
    public interface IDatasetService
    {
        Task<DatasetMetadata> ProcessDatasetAsync(IFormFile file);
        Task<ValidationResult> ValidateDateRangesAsync(DateRanges dateRanges);
        Task<string> GetDatasetPathAsync();
        DateRanges? GetValidatedDateRanges();
        int GetSimulationRecordCount();
        DatasetMetadata? GetDatasetMetadata();
        Task<List<Dictionary<string, object>>> GetSimulationDataAsync();
    }
}
