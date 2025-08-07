namespace IntelliInspect.Api.Models
{
    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
        public string? Message { get; set; }
        
        // Enhanced data for successful validation
        public DataDistribution? DataDistribution { get; set; }
    }

    public class DataDistribution
    {
        public int TrainingRecords { get; set; }
        public int TestingRecords { get; set; }
        public int SimulationRecords { get; set; }
        public List<MonthlyData> MonthlyDistribution { get; set; } = new List<MonthlyData>();
    }

    public class MonthlyData
    {
        public string Month { get; set; } = string.Empty; // Format: "2024-01"
        public string MonthName { get; set; } = string.Empty; // Format: "Jan 2024"
        public int TrainingCount { get; set; }
        public int TestingCount { get; set; }
        public int SimulationCount { get; set; }
        public int TotalCount { get; set; }
    }
}
