namespace IntelliInspect.Api.Models
{
    public class DatasetMetadata
    {
        public int RecordCount { get; set; }
        public int ColumnCount { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public double PassRate { get; set; }
        public int PassCount { get; set; }
        public int FailCount { get; set; }
        public string FileName { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }
}
