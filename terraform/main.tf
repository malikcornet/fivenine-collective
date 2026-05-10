terraform {
  required_providers {
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.6"
    }
  }
}

provider "railway" {
  token = var.railway_token
}

resource "railway_project" "main" {
  name = "fivenine-collective"
}

locals {
  env_id = railway_project.main.default_environment.id
}

# ── Server ─────────────────────────────────────────────────────────────────

resource "railway_service" "server" {
  name               = "server"
  project_id         = railway_project.main.id
  source_repo        = "malikcornet/fivenine-collective"
  source_repo_branch = "main"
  root_directory     = "projects/FiveNine-Collective.Site/Src/FiveNine-Collective.Site.Server"
}

resource "railway_service_domain" "server" {
  subdomain      = "${var.subdomain_prefix}-api"
  service_id     = railway_service.server.id
  environment_id = local.env_id
}

resource "railway_variable" "allowed_origins" {
  name           = "ALLOWED_ORIGINS"
  value          = "https://${railway_service_domain.frontend.domain}"
  service_id     = railway_service.server.id
  environment_id = local.env_id
}

# ── Frontend ───────────────────────────────────────────────────────────────

resource "railway_service" "frontend" {
  name               = "frontend"
  project_id         = railway_project.main.id
  source_repo        = "malikcornet/fivenine-collective"
  source_repo_branch = "main"
  root_directory     = "projects/FiveNine-Collective.Site/Src/frontend"
}

resource "railway_service_domain" "frontend" {
  subdomain      = var.subdomain_prefix
  service_id     = railway_service.frontend.id
  environment_id = local.env_id
}

resource "railway_variable" "vite_api_url" {
  name           = "VITE_API_URL"
  value          = "https://${railway_service_domain.server.domain}"
  service_id     = railway_service.frontend.id
  environment_id = local.env_id
}
