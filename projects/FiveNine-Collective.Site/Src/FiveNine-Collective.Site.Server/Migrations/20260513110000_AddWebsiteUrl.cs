using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FiveNineCollective.Site.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddWebsiteUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WebsiteUrl",
                table: "UserAccounts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WebsiteUrl",
                table: "UserAccounts");
        }
    }
}
