using System.Text.Json.Serialization;

namespace IntelliInspect.Api.Models
{
    public class ModelMetrics
    {
        public double Accuracy { get; set; }
        public double Precision { get; set; }
        public double Recall { get; set; }
        public double F1Score { get; set; }
        public ConfusionMatrix ConfusionMatrix { get; set; } = new ConfusionMatrix();
        public TrainingHistory TrainingHistory { get; set; } = new TrainingHistory();
    }

    public class ConfusionMatrix
    {
        public int TruePositive { get; set; }
        public int TrueNegative { get; set; }
        public int FalsePositive { get; set; }
        public int FalseNegative { get; set; }
    }

    public class TrainingHistory
    {
        public List<int> Epochs { get; set; } = new List<int>();
        public List<double> Accuracy { get; set; } = new List<double>();
        public List<double> Loss { get; set; } = new List<double>();
    }

    public class PredictionResult
    {
        public string Timestamp { get; set; } = string.Empty;
        public string SampleId { get; set; } = string.Empty;
        public string Prediction { get; set; } = string.Empty;
        public double Confidence { get; set; }
    }

    public class SimulationStatus
    {
        public bool IsRunning { get; set; }
        public int TotalPredictions { get; set; }
        public int PassCount { get; set; }
        public int FailCount { get; set; }
        public double AverageConfidence { get; set; }
        public int? ExpectedCount { get; set; }
    }

    // Models for ML Service communication
    public class MLTrainingRequest
    {
        [JsonPropertyName("dateRanges")]
        public DateRanges DateRanges { get; set; } = new DateRanges();
        
        [JsonPropertyName("datasetPath")]
        public string DatasetPath { get; set; } = string.Empty;
    }

    public class MLPredictionRequest
    {
        public Dictionary<string, object> Features { get; set; } = new Dictionary<string, object>();
    }

    public class MLPredictionResponse
    {
        public string Prediction { get; set; } = string.Empty;
        public double Confidence { get; set; }
    }
}
