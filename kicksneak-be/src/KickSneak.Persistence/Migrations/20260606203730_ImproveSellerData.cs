using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KickSneak.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ImproveSellerData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "sellers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyName",
                table: "sellers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasCompany",
                table: "sellers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "sellers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductType",
                table: "sellers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SellType",
                table: "sellers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StoreName",
                table: "sellers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VatNumber",
                table: "sellers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "sellers");

            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "sellers");

            migrationBuilder.DropColumn(
                name: "HasCompany",
                table: "sellers");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "sellers");

            migrationBuilder.DropColumn(
                name: "ProductType",
                table: "sellers");

            migrationBuilder.DropColumn(
                name: "SellType",
                table: "sellers");

            migrationBuilder.DropColumn(
                name: "StoreName",
                table: "sellers");

            migrationBuilder.DropColumn(
                name: "VatNumber",
                table: "sellers");
        }
    }
}
