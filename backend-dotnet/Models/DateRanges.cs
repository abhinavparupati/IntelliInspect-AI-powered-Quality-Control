using System.Text.Json.Serialization;

namespace IntelliInspect.Api.Models
{
    public class DateRanges
    {
        [JsonPropertyName("training")]
        public DateRange Training { get; set; } = new DateRange();
        
        [JsonPropertyName("testing")]
        public DateRange Testing { get; set; } = new DateRange();
        
        [JsonPropertyName("simulation")]
        public DateRange Simulation { get; set; } = new DateRange();
    }

    public class DateRange
    {
        [JsonPropertyName("start")]
        public DateTime Start { get; set; }
        
        [JsonPropertyName("end")]
        public DateTime End { get; set; }
    }
}
