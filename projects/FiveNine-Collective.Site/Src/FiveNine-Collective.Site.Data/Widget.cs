using System.Text.Json;

namespace FiveNine_Collective_Site.Data;

public class Widget
{
    public Guid Id { get; set; }

    /// <summary>The container (profile or project) this widget belongs to.</summary>
    public Guid CanvasItemId { get; set; }

    public CanvasItem CanvasItem { get; set; } = null!;

    /// <summary>Widget kind discriminator (e.g. 'text', 'picture', 'video').
    /// Validated against the per-container allow-list in StudioService.</summary>
    public required string Type { get; set; }

    public int Col { get; set; }
    public int Row { get; set; }
    public int W { get; set; }
    public int H { get; set; }

    /// <summary>Type-specific payload (shape depends on <see cref="Type"/>). Stored as jsonb.</summary>
    public required JsonDocument Data { get; set; }
}
