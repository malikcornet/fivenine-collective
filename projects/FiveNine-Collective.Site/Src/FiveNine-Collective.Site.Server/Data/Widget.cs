using System.Text.Json;

namespace FiveNine_Collective_Site_Server.Data;

public class Widget
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public Profile Profile { get; set; } = null!;

    /// <summary>Discriminator from the frontend: profile, about, text, links, gallery, socials, video, project.</summary>
    public required string Type { get; set; }

    public int Col { get; set; }
    public int Row { get; set; }
    public int W { get; set; }
    public int H { get; set; }

    /// <summary>Type-specific payload (shape depends on <see cref="Type"/>). Stored as jsonb.</summary>
    public required JsonDocument Data { get; set; }
}
