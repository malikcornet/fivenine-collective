namespace FiveNine_Collective_Site.Data;

/// <summary>
/// Anything that occupies bounded space on the studio canvas. Profile and
/// Project are the concrete kinds today; new kinds plug in by adding another
/// subclass + EF discriminator value and extending the frontend
/// CanvasItemKind union.
///
/// EF maps the hierarchy with Table-Per-Hierarchy (TPH): one CanvasItems
/// table, a "Kind" discriminator column, and nullable per-kind columns.
/// </summary>
public abstract class CanvasItem
{
    public Guid Id { get; set; }

    /// <summary>Auth0 subject claim of the creator/owner. For profiles this
    /// is the profile's user; for projects it's the user who created the
    /// project (collaborators are tracked separately in <see cref="ProjectItem"/>).</summary>
    public required string Auth0Sub { get; set; }

    /// <summary>Display name. Profile = person name, Project = project title.</summary>
    public string Name { get; set; } = "";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<Widget> Widgets { get; set; } = [];
}

/// <summary>
/// A user's personal canvas item — owned 1:1 by an Auth0 sub. Editing of its
/// widgets is gated on owner-match.
/// </summary>
public class ProfileItem : CanvasItem
{
    /// <summary>Short role/title line under the name on the profile card.</summary>
    public string Role { get; set; } = "";

    /// <summary>One-line bio.</summary>
    public string Bio { get; set; } = "";
}

/// <summary>
/// A shared workspace. Multiple profiles can collaborate inside a project
/// (collaborator policy enforced at write time — not yet implemented).
/// </summary>
public class ProjectItem : CanvasItem
{
    /// <summary>Free-form description shown on the project card.</summary>
    public string Description { get; set; } = "";

    /// <summary>Auth0 subs allowed to add or edit widgets inside this
    /// project. The creator is implicitly included. Stored as a text[].</summary>
    public List<string> CollaboratorSubs { get; set; } = [];
}
