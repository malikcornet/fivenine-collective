using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FiveNineCollective.Site.Server.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyWidgetsAndProfileIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bio",
                table: "Profiles",
                type: "character varying(280)",
                maxLength: 280,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Profiles",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Profiles",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            // Backfill Profile.Name / Role / Bio from any existing 'profile' widget data
            // before we drop those rows. Each profile has at most one 'profile' widget.
            migrationBuilder.Sql(@"
                UPDATE ""Profiles"" p
                SET
                    ""Name"" = COALESCE(NULLIF(w.""Data""->>'name', ''), p.""Name""),
                    ""Role"" = COALESCE(NULLIF(w.""Data""->>'role', ''), p.""Role""),
                    ""Bio""  = COALESCE(NULLIF(w.""Data""->>'bio', ''),  p.""Bio"")
                FROM ""Widgets"" w
                WHERE w.""ProfileId"" = p.""Id"" AND w.""Type"" = 'profile';
            ");

            // Remove widget rows for types that no longer exist in the client model.
            migrationBuilder.Sql(@"
                DELETE FROM ""Widgets""
                WHERE ""Type"" NOT IN ('text', 'picture', 'video');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Bio",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Profiles");
        }
    }
}
