using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KickSneak.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationHref : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Href",
                table: "notifications",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Href",
                table: "notifications");
        }
    }
}
