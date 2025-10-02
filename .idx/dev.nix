# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
  ];

  # Sets environment variables in the workspace
  env = {};

  idx = {
    extensions = [
      "google.gemini-cli-vscode-ide-companion"
    ];

    previews = {
      enable = true;
      previews = {
        web = {
          # CORRECTED: Use `cwd` to specify the working directory.
          cwd = "frontend";
          # The command itself must be a list of space-separated strings.
          command = [ "npm" "run" "dev" "--" "--port" "$PORT" ];
          manager = "web";
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # This command is correct as it's a shell script that runs on create.
      onCreate = {
        npm-install = "cd frontend && npm install";
      };
      onStart = {};
    };
  };
}
