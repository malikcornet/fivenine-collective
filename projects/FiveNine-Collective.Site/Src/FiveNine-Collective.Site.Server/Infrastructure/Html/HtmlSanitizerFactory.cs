using Ganss.Xss;

namespace FiveNine_Collective_Site_Server.Infrastructure.Html;

/// <summary>
/// Produces a pre-configured <see cref="HtmlSanitizer"/> instance for use as a singleton.
/// Registering as a singleton avoids re-configuring the sanitizer on every request.
/// </summary>
public static class HtmlSanitizerFactory
{
    /// <summary>
    /// Creates an <see cref="HtmlSanitizer"/> that permits inline <c>&lt;style&gt;</c>
    /// blocks and <c>style</c> attributes in addition to its safe defaults.
    /// </summary>
    public static HtmlSanitizer Create()
    {
        var sanitizer = new HtmlSanitizer();
        sanitizer.AllowedTags.Add("style");
        sanitizer.AllowedAttributes.Add("style");
        return sanitizer;
    }
}
