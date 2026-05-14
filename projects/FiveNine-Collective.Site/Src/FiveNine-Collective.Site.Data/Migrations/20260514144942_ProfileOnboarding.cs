using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FiveNine_Collective_Site.Data.Migrations
{
    /// <inheritdoc />
    public partial class ProfileOnboarding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "CanvasItems",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastName",
                table: "CanvasItems",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "OnboardedAt",
                table: "CanvasItems",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FirstName",
                table: "CanvasItems");

            migrationBuilder.DropColumn(
                name: "LastName",
                table: "CanvasItems");

            migrationBuilder.DropColumn(
                name: "OnboardedAt",
                table: "CanvasItems");
        }
    }
}
