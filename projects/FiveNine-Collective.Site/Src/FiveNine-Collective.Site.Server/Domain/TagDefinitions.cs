namespace FiveNine_Collective_Site_Server.Domain;

/// <summary>
/// The canonical set of expertise tags a user may select.
/// This is the single source of truth — keep it in sync with the frontend's ALL_TAGS list
/// in <c>frontend/src/components/ProfileTags.tsx</c>.
/// </summary>
public static class TagDefinitions
{
    public static readonly IReadOnlySet<string> Allowed = new HashSet<string>(StringComparer.Ordinal)
    {
        "Technology", "Design", "Art", "Photography", "Music", "Writing",
        "Film & Video", "Gaming", "Fashion", "Architecture", "Science",
        "Business", "Education", "Sports", "Food", "Travel", "3D & Motion",
        "Open Source", "Entrepreneurship", "Community", "Research", "Illustration",
        "Audio", "Animation", "UX / Product",
    };

    /// <summary>Returns <c>true</c> when every tag in <paramref name="tags"/> is in the allowed set.</summary>
    public static bool AllValid(IEnumerable<string> tags) =>
        tags.All(Allowed.Contains);
}
