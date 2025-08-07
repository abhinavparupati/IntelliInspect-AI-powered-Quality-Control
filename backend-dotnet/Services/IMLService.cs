using IntelliInspect.Api.Models;

namespace IntelliInspect.Api.Services
{
    public interface IMLService
    {
        Task<ModelMetrics> TrainModelAsync(MLTrainingRequest request);
        Task<MLPredictionResponse> PredictAsync(MLPredictionRequest request);
        Task<bool> IsModelReadyAsync();
    }
}
