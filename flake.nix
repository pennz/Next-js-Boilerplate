{
  description = "Next.js 15 Full-Stack Development Environment - macOS Intel Optimized";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Node.js version (LTS recommended for Next.js 15)
        nodejs = pkgs.nodejs_20;
        
        # macOS-specific configurations
        isDarwin = pkgs.stdenv.isDarwin;
        
        # macOS-specific packages
        darwinDeps = with pkgs; pkgs.lib.optionals isDarwin [
          # macOS development tools
          darwin.apple_sdk.frameworks.Security
          darwin.apple_sdk.frameworks.CoreFoundation
          darwin.apple_sdk.frameworks.SystemConfiguration
          
          # macOS command line tools
          coreutils  # GNU coreutils for consistent behavior
          gnused    # GNU sed instead of BSD sed
          gnutar    # GNU tar instead of BSD tar
          findutils  # GNU find instead of BSD find
          
          # macOS-specific utilities
          terminal-notifier  # Desktop notifications
          trash-cli         # Better rm alternative for macOS
        ];
        
        # System dependencies needed for the project
        systemDeps = with pkgs; [
          # Core development tools
          nodejs
          nodePackages.npm
          nodePackages.pnpm    # Alternative package manager
          yarn                 # Alternative package manager
          
          # Database - PostgreSQL optimized for macOS
          postgresql_15
          
          # Development tools
          git
          curl
          wget
          
          # Build tools that might be needed by native modules
          gcc
          gnumake
          python3
          pkg-config
          autoconf
          automake
          libtool
          
          # Image processing (for Next.js image optimization)
          vips
          imagemagick
          
          # Playwright dependencies for E2E testing
          playwright-driver.browsers
          
          # Additional development tools
          jq                 # JSON processing
          tree               # Directory structure viewing
          fd                 # File finding (faster than find)
          ripgrep           # Fast grep replacement
          bat               # Better cat with syntax highlighting
          
          # SSL/TLS for HTTPS development
          openssl
          
          # Development servers and tools
          httpie            # Better curl for API testing
          watchman          # File watching (used by React Native, Metro)
          
          # Process management
          tmux              # Terminal multiplexer
          htop              # Process viewer
          
          # macOS-specific tools
          fswatch           # File system watching (macOS optimized)
          
          # Docker support (if needed)
          docker-compose
        ] ++ darwinDeps;

        # Environment variables for development
        shellEnvVars = {
          # Node.js configuration
          NODE_ENV = "development";
          
          # PostgreSQL configuration for local development (macOS paths)
          PGDATA = "$PWD/.postgres";
          PGHOST = "localhost";
          PGPORT = "5432";
          PGDATABASE = "development";
          PGUSER = "development";
          
          # Development database URL
          DATABASE_URL = "postgresql://development:development@localhost:5432/development";
          
          # Enable Turbopack for faster builds
          TURBOPACK = "1";
          
          # Playwright configuration
          PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          
          # macOS-specific optimizations
          OBJC_DISABLE_INITIALIZE_FORK_SAFETY = "YES";  # Fix for some Node.js native modules
          
          # Development optimizations
          FORCE_COLOR = "1";           # Enable colors in terminal
          TERM = "xterm-256color";     # Better terminal support
          
          # Memory and performance tuning for macOS
          NODE_OPTIONS = "--max-old-space-size=4096";  # Increase Node.js memory limit
          
          # Path additions for GNU tools on macOS
          PATH = pkgs.lib.optionalString isDarwin "${pkgs.coreutils}/bin:${pkgs.gnused}/bin:${pkgs.gnutar}/bin:${pkgs.findutils}/bin:$PATH";
        };

        # macOS-specific development scripts
        devScripts = pkgs.writeShellScriptBin "dev-setup" ''
          echo "🍎 Setting up macOS development environment..."
          
          # Temporarily unset PGUSER to avoid confusion during setup
          unset PGUSER
          
          # Check for Xcode Command Line Tools on macOS
          if [[ "$OSTYPE" == "darwin"* ]] && ! xcode-select -p &> /dev/null; then
            echo "⚠️  Xcode Command Line Tools not found. Installing..."
            xcode-select --install
            echo "Please complete the Xcode installation and re-run this script."
            exit 1
          fi
          
          # Initialize PostgreSQL if not exists
          if [ ! -d "$PGDATA" ]; then
            echo "📦 Initializing PostgreSQL database..."
            initdb --auth-local=trust --auth-host=md5 --encoding=UTF8 --locale=C --username=$(whoami)
            
            # macOS-specific PostgreSQL configuration
            echo "port = 5432" >> "$PGDATA/postgresql.conf"
            echo "unix_socket_directories = '$PWD/.postgres'" >> "$PGDATA/postgresql.conf"
            echo "shared_preload_libraries = ''" >> "$PGDATA/postgresql.conf"
            echo "max_connections = 100" >> "$PGDATA/postgresql.conf"
            echo "shared_buffers = 128MB" >> "$PGDATA/postgresql.conf"
            echo "dynamic_shared_memory_type = posix" >> "$PGDATA/postgresql.conf"
            echo "log_statement = 'none'" >> "$PGDATA/postgresql.conf"
            echo "log_min_duration_statement = -1" >> "$PGDATA/postgresql.conf"
            
            # Allow local connections without password
            echo "host all all 127.0.0.1/32 trust" >> "$PGDATA/pg_hba.conf"
            echo "host all all ::1/128 trust" >> "$PGDATA/pg_hba.conf"
          fi
          
          # Start PostgreSQL
          if ! pg_ctl status > /dev/null 2>&1; then
            test -d "$HOME/.postgres" || mkdir "$HOME/.postgres"
            echo "🐘 Starting PostgreSQL..."
            pg_ctl start -l "$PGDATA/postgres.log" -o "-F -p 5432"
            sleep 3
            
            # Wait for PostgreSQL to be ready
            timeout=30
            while ! pg_isready -h localhost -p 5432 > /dev/null 2>&1 && [ $timeout -gt 0 ]; do
              sleep 1
              timeout=$((timeout - 1))
            done
            
            if [ $timeout -eq 0 ]; then
              echo "❌ PostgreSQL failed to start within 30 seconds"
              exit 1
            fi
          fi
          
          # Create database and user if they don't exist
          # Connect as the default user (usually your macOS username)
          DEFAULT_USER=$(whoami)
          
          # Check if development user exists
          if ! psql -h localhost -p 5432 -d postgres -U "$DEFAULT_USER" -c "SELECT 1 FROM pg_user WHERE usename = 'development';" | grep -q 1; then
            echo "🔧 Creating development user..."
            psql -h localhost -p 5432 -d postgres -U "$DEFAULT_USER" -c "CREATE USER development WITH PASSWORD 'development' CREATEDB;"
          fi
          
          # Check if development database exists
          if ! psql -h localhost -p 5432 -d postgres -U "$DEFAULT_USER" -lqt | cut -d \| -f 1 | grep -qw development; then
            echo "🔧 Creating development database..."
            createdb -h localhost -p 5432 -U "$DEFAULT_USER" -O development development
          fi
          
          # Grant necessary permissions
          psql -h localhost -p 5432 -d development -U "$DEFAULT_USER" -c "GRANT ALL PRIVILEGES ON DATABASE development TO development;" || true
          psql -h localhost -p 5432 -d development -U "$DEFAULT_USER" -c "GRANT ALL ON SCHEMA public TO development;" || true
          
          # Create .env.local if it doesn't exist
          if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
            echo "📝 Creating .env.local from .env.example..."
            cp .env.example .env.local
            echo "DATABASE_URL=postgresql://development:development@localhost:5432/development" >> .env.local
          fi
          
          # macOS notification
          if command -v terminal-notifier &> /dev/null; then
            terminal-notifier -title "Development Environment" -message "Setup complete! Ready to code 🚀"
          fi
          
          echo "✅ Development environment ready!"
          echo ""
          echo "📝 Available commands:"
          echo "  npm run dev       - Start development server (with Turbopack)"
          echo "  npm run build     - Build for production"
          echo "  npm run test      - Run unit tests"
          echo "  npm run test:e2e  - Run E2E tests (Playwright)"
          echo "  npm run db:studio - Open Drizzle Studio"
          echo "  npm run storybook - Run Storybook"
          echo "  dev-stop          - Stop development services"
          echo "  dev-logs          - View PostgreSQL logs"
          echo "  dev-reset         - Reset database (removes all data)"
          echo ""
          echo "🔧 Development tools:"
          echo "  Node.js: $(node --version)"
          echo "  npm: $(npm --version)"
          echo "  PostgreSQL: Running on port 5432"
          echo "  Database: postgresql://development:development@localhost:5432/development"
          echo "  Super user: $(whoami) (for admin tasks)"
          echo ""
          echo "🧪 Test connection:"
          echo "  psql -h localhost -p 5432 -d development -U development"
        '';

        stopScript = pkgs.writeShellScriptBin "dev-stop" ''
          echo "🛑 Stopping development services..."
          
          if pg_ctl status > /dev/null 2>&1; then
            echo "📦 Stopping PostgreSQL..."
            pg_ctl stop -m fast
            echo "✅ PostgreSQL stopped"
          else
            echo "ℹ️  PostgreSQL was not running"
          fi
          
          # Kill any remaining Node.js processes (be careful with this)
          pkill -f "next" 2>/dev/null || true
          pkill -f "turbopack" 2>/dev/null || true
          
          # macOS notification
          if command -v terminal-notifier &> /dev/null; then
            terminal-notifier -title "Development Environment" -message "Services stopped 🛑"
          fi
          
          echo "✅ Development services stopped"
        '';

        logsScript = pkgs.writeShellScriptBin "dev-logs" ''
          echo "📋 Development logs..."
          echo ""
          echo "=== PostgreSQL Logs ==="
          if [ -f "$PGDATA/postgres.log" ]; then
            tail -n 50 "$PGDATA/postgres.log"
          else
            echo "No PostgreSQL logs found"
          fi
          echo ""
          echo "=== PostgreSQL Status ==="
          pg_ctl status || echo "PostgreSQL not running"
          echo ""
          echo "=== PostgreSQL Users ==="
          psql -h localhost -p 5432 -d postgres -U "$(whoami)" -c "SELECT usename, createdb, usesuper FROM pg_user;" 2>/dev/null || echo "Cannot connect to PostgreSQL"
          echo ""
          echo "=== PostgreSQL Databases ==="
          psql -h localhost -p 5432 -d postgres -U "$(whoami)" -c "\l" 2>/dev/null || echo "Cannot connect to PostgreSQL"
        '';

        simpleSetupScript = pkgs.writeShellScriptBin "dev-setup-simple" ''
          #!/bin/bash
          # Simple PostgreSQL setup for development (alternative approach)
          # Run this if dev-setup is having connection issues
          
          set -e
          
          echo "🍎 Simple macOS PostgreSQL setup..."
          
          # Temporarily unset problematic environment variables
          unset PGUSER PGDATABASE
          
          # Get current user
          CURRENT_USER=$(whoami)
          PGDATA="$PWD/.postgres"
          
          echo "📦 Setting up PostgreSQL..."
          
          # Stop any running PostgreSQL
          pg_ctl stop -D "$PGDATA" -m fast 2>/dev/null || true
          
          # Remove existing data directory if corrupted
          if [ -d "$PGDATA" ]; then
              echo "🗑️  Removing existing database..."
              rm -rf "$PGDATA"
          fi
          
          # Initialize fresh database
          echo "🔧 Initializing new database..."
          initdb -D "$PGDATA" --auth-local=trust --auth-host=md5 --encoding=UTF8 --username="$CURRENT_USER"
          
          # Configure PostgreSQL
          echo "⚙️  Configuring PostgreSQL..."
          cat >> "$PGDATA/postgresql.conf" << 'EOF'
port = 5432
unix_socket_directories = '$PWD/.postgres'
shared_preload_libraries = ''
max_connections = 100
shared_buffers = 128MB
dynamic_shared_memory_type = posix
log_statement = 'none'
log_min_duration_statement = -1
EOF
          
          # Set up authentication - allow local connections without password
          cat > "$PGDATA/pg_hba.conf" << 'EOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
EOF
          
          # Start PostgreSQL
          echo "🚀 Starting PostgreSQL..."
          pg_ctl start -D "$PGDATA" -l "$PGDATA/postgres.log" -o "-F -p 5432"
          
          # Wait for startup
          sleep 3
          
          # Create development user and database
          echo "👤 Creating development user..."
          psql -h localhost -p 5432 -d postgres -U "$CURRENT_USER" << 'EOF'
CREATE USER development WITH PASSWORD 'development' CREATEDB;
CREATE DATABASE development OWNER development;
GRANT ALL PRIVILEGES ON DATABASE development TO development;
EOF
          
          # Test connections
          echo "✅ Testing connections..."
          psql -h localhost -p 5432 -d development -U development -c "SELECT 'Connection successful!' as status;"
          
          # Create .env.local if needed
          if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
              echo "📝 Creating .env.local..."
              cp .env.example .env.local
              echo "DATABASE_URL=postgresql://development:development@localhost:5432/development" >> .env.local
          fi
          
          echo ""
          echo "✅ Simple setup complete!"
          echo "🔗 Database URL: postgresql://development:development@localhost:5432/development"
          echo "🛠️  To stop: pg_ctl stop -D .postgres"
        resetScript = pkgs.writeShellScriptBin "dev-reset" ''
          echo "🔄 Resetting development environment..."
          echo "⚠️  This will delete all data in your development database!"
          read -p "Are you sure? (y/N): " -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🛑 Stopping services..."
            dev-stop
            
            echo "🗑️  Removing database..."
            rm -rf .postgres
            
            echo "🚀 Reinitializing..."
            dev-setup
          else
            echo "❌ Reset cancelled"
          fi
        '';
          echo "🔄 Resetting development environment..."
          echo "⚠️  This will delete all data in your development database!"
          read -p "Are you sure? (y/N): " -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🛑 Stopping services..."
            dev-stop
            
            echo "🗑️  Removing database..."
            rm -rf .postgres
            
            echo "🚀 Reinitializing..."
            dev-setup
          else
            echo "❌ Reset cancelled"
          fi
        '';

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = systemDeps ++ [ devScripts stopScript logsScript resetScript simpleSetupScript ];
          
          shellHook = ''
            # Set environment variables
            ${builtins.concatStringsSep "\n" (
              pkgs.lib.mapAttrsToList (name: value: "export ${name}=${value}") shellEnvVars
            )}
            
            # Create necessary directories
            mkdir -p .postgres
            mkdir -p .nix/bin
            
            # macOS-specific ulimit adjustments for development
            ulimit -n 65536 2>/dev/null || true
            
            # Display welcome message
            echo "🍎 Next.js 15 Full-Stack Development Environment"
            echo "🖥️  Platform: macOS Intel (x86_64-darwin)"
            echo "📁 Project: $(basename $PWD)"
            echo ""
            echo "🔧 Development stack ready:"
            echo "  • Node.js: $(node --version)"
            echo "  • npm: $(npm --version) / pnpm: $(pnpm --version)"
            echo "  • PostgreSQL: $(postgres --version | head -n1 | cut -d' ' -f3)"
            echo "  • Playwright: Browsers pre-installed"
            echo "  • Turbopack: Enabled for faster builds"
            echo ""
            echo "🚀 Quick start:"
            echo "  1. Run 'dev-setup' to initialize services"
            echo "  2. Copy/edit .env.local with your configuration"
            echo "  3. Run 'npm install' to install dependencies"
            echo "  4. Run 'npm run dev' to start development"
            echo ""
            echo "🛠️  Helper commands:"
            echo "  • dev-setup        - Initialize development environment"
            echo "  • dev-setup-simple - Alternative setup (if having connection issues)"
            echo "  • dev-stop         - Stop all services"
            echo "  • dev-logs         - View service logs"
            echo "  • dev-reset        - Reset database (removes all data)"
            echo ""
            echo "💡 Run 'dev-setup' to get started!"
          '';
          
          # Enable experimental features for better development experience
          NIX_CONFIG = "experimental-features = nix-command flakes";
        };

        # CI shell optimized for GitHub Actions or similar
        devShells.ci = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            git
            postgresql_15
            # Minimal CI environment
          ];
          shellHook = ''
            export NODE_ENV=test
            export CI=true
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
          '';
        };

        # Production shell
        devShells.production = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            postgresql_15
            openssl
          ];
          shellHook = ''
            export NODE_ENV=production
            export NODE_OPTIONS="--max-old-space-size=2048"
          '';
        };

        # Package the application (for deployment)
        packages.default = pkgs.buildNpmPackage {
          pname = "nextjs-app";
          version = "0.1.0";
          
          src = ./.;
          
          # You'll need to run `nix build` once and update this hash
          npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          
          nativeBuildInputs = with pkgs; [
            nodejs
            python3  # For native module compilation
          ] ++ pkgs.lib.optionals isDarwin [
            darwin.apple_sdk.frameworks.Security
          ];
          
          buildPhase = ''
            export NODE_ENV=production
            npm run build
          '';
          
          installPhase = ''
            mkdir -p $out
            cp -r .next $out/
            cp -r public $out/ 2>/dev/null || true
            cp package.json $out/
            cp next.config.* $out/ 2>/dev/null || true
          '';
          
          meta = with pkgs.lib; {
            description = "Next.js 15 Full-Stack Application";
            platforms = platforms.darwin;
          };
        };
      }
    );
}
