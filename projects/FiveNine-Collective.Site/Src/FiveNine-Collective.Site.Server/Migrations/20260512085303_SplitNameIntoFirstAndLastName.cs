using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FiveNineCollective.Site.Server.Migrations
{
    /// <inheritdoc />
    public partial class SplitNameIntoFirstAndLastName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DisplayName",
                table: "UserAccounts",
                newName: "LastName");

            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "UserAccounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FirstName",
                table: "UserAccounts");

            migrationBuilder.RenameColumn(
                name: "LastName",
                table: "UserAccounts",
                newName: "DisplayName");
        }
    }
}
