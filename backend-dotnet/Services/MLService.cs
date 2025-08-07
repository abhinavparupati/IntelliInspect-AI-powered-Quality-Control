using IntelliInspect.Api.Models;
using System.Text;
using System.Text.Json;

namespace IntelliInspect.Api.Services
{
    public class MLService : IMLService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<MLService> _logger;
        private readonly string _mlServiceUrl;

        public MLService(HttpClient httpClient, ILogger<MLService> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            
            // Log immediately to make sure constructor is called
            Console.WriteLine("=== MLService Constructor Called ===");
            _logger.LogCritical("=== MLService Constructor Called ===");
            
            // Force the use of environment variable
            var envUrl = Environment.GetEnvironmentVariable("ML_SERVICE_URL");
            var configUrl = configuration.GetValue<string>("ML_SERVICE_URL");
            
            // Log values immediately
            Console.WriteLine($"Environment ML_SERVICE_URL: '{envUrl ?? "NULL"}'");
            Console.WriteLine($"Configuration ML_SERVICE_URL: '{configUrl ?? "NULL"}'");
            
            // Explicitly prioritize environment variable
            if (!string.IsNullOrEmpty(envUrl))
            {
                _mlServiceUrl = envUrl;
                _logger.LogCritical("MLService using ENVIRONMENT variable URL: {Url}", _mlServiceUrl);
                Console.WriteLine($"Using ENVIRONMENT URL: {_mlServiceUrl}");
            }
            else if (!string.IsNullOrEmpty(configUrl))
            {
                _mlServiceUrl = configUrl;
                _logger.LogCritical("MLService using CONFIGURATION URL: {Url}", _mlServiceUrl);
                Console.WriteLine($"Using CONFIGURATION URL: {_mlServiceUrl}");
            }
            else
            {
                _mlServiceUrl = "http://ml-service-python:8000";
                _logger.LogCritical("MLService using FALLBACK URL: {Url}", _mlServiceUrl);
                Console.WriteLine($"Using FALLBACK URL: {_mlServiceUrl}");
            }
            
            _logger.LogCritical("=== MLService Debug Info ===");
            _logger.LogCritical("Final URL used: {Url}", _mlServiceUrl);
            _logger.LogCritical("Environment ML_SERVICE_URL: '{EnvUrl}'", envUrl ?? "NULL");
            _logger.LogCritical("Configuration ML_SERVICE_URL: '{ConfigUrl}'", configUrl ?? "NULL");
            _logger.LogCritical("=============================");
            
            Console.WriteLine($"=== Final URL: {_mlServiceUrl} ===");
        }

        public async Task<ModelMetrics> TrainModelAsync(MLTrainingRequest request)
        {
            try
            {
                _logger.LogInformation("Starting model training request to ML service");
                _logger.LogInformation("USING URL: {Url} for training", _mlServiceUrl);
                
                var requestUrl = $"{_mlServiceUrl}/train";
                _logger.LogInformation("Full request URL: {RequestUrl}", requestUrl);
                _logger.LogInformation("Training request: {@Request}", request);

                var json = JsonSerializer.Serialize(request, new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
                });
                _logger.LogInformation("Serialized JSON: {Json}", json);
                
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(requestUrl, content);
                
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("ML service response status: {Status}, content: {Content}", 
                    response.StatusCode, responseContent);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("ML service returned error: {Status} - {Content}", 
                        response.StatusCode, responseContent);
                    throw new InvalidOperationException($"ML service error: {response.StatusCode} - {responseContent}");
                }

                var metrics = JsonSerializer.Deserialize<ModelMetrics>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                _logger.LogInformation("Model training completed successfully with real ML service");
                _logger.LogInformation("Metrics: Accuracy={Accuracy:P2}, Precision={Precision:P2}, Recall={Recall:P2}, F1={F1:P2}", 
                    metrics?.Accuracy, metrics?.Precision, metrics?.Recall, metrics?.F1Score);
                
                return metrics ?? throw new InvalidOperationException("ML service returned null metrics");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CRITICAL: ML service failed - this should not fall back to demo data");
                throw; // Don't fall back to demo data - throw the actual error
            }
        }

        public async Task<MLPredictionResponse> PredictAsync(MLPredictionRequest request)
        {
            try
            {
                _logger.LogInformation("Making prediction request to ML service");
                
                var json = JsonSerializer.Serialize(request, new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
                });
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{_mlServiceUrl}/predict", content);
                
                var responseContent = await response.Content.ReadAsStringAsync();
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("ML prediction service returned error: {Status} - {Content}", 
                        response.StatusCode, responseContent);
                    throw new InvalidOperationException($"ML prediction error: {response.StatusCode} - {responseContent}");
                }

                var prediction = JsonSerializer.Deserialize<MLPredictionResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                _logger.LogInformation("Prediction completed: {Prediction} with confidence {Confidence:P2}", 
                    prediction?.Prediction, prediction?.Confidence);
                
                return prediction ?? throw new InvalidOperationException("ML service returned null prediction");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CRITICAL: ML prediction service failed");
                throw; // Don't fall back to demo predictions
            }
        }

        public async Task<bool> IsModelReadyAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_mlServiceUrl}/model/status");
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        private static ModelMetrics CreateDemoMetrics()
        {
            var random = new Random();
            return new ModelMetrics
            {
                Accuracy = 0.85 + random.NextDouble() * 0.1, // 85-95%
                Precision = 0.82 + random.NextDouble() * 0.1, // 82-92%
                Recall = 0.87 + random.NextDouble() * 0.08, // 87-95%
                F1Score = 0.84 + random.NextDouble() * 0.1, // 84-94%
                ConfusionMatrix = new ConfusionMatrix
                {
                    TruePositive = 1250 + random.Next(0, 100),
                    TrueNegative = 3420 + random.Next(0, 200),
                    FalsePositive = 180 + random.Next(0, 50),
                    FalseNegative = 150 + random.Next(0, 40)
                },
                TrainingHistory = new TrainingHistory
                {
                    Epochs = Enumerable.Range(1, 10).ToList(),
                    Accuracy = Enumerable.Range(1, 10).Select(i => 0.6 + (i * 0.03) + random.NextDouble() * 0.02).ToList(),
                    Loss = Enumerable.Range(1, 10).Select(i => 0.8 - (i * 0.07) + random.NextDouble() * 0.05).ToList()
                }
            };
        }

        private static MLPredictionResponse CreateDemoPrediction()
        {
            var random = new Random();
            var isPass = random.NextDouble() > 0.3; // 70% pass rate
            
            return new MLPredictionResponse
            {
                Prediction = isPass ? "Pass" : "Fail",
                Confidence = 0.7 + random.NextDouble() * 0.3 // 70-100%
            };
        }
    }
}
