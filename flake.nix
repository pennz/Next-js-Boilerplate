{
  description = "Next.js 15 Full-Stack Development Environment - Debian 12 x86_64";

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
        
        # Linux-specific packages for Debian 12
        linuxDeps = with pkgs; [
          # System utilities
          coreutils
          util-linux
          procps
          psmisc
          
          # Development tools
          gcc
          glibc
          
          # File system and process monitoring
          inotify-tools
          
          # Desktop notifications
          libnotify
          
          # Network tools
          nettools
          
          # Archive tools
          gnutar
          gzip
          unzip
          
          # Text processing
          gnused
          gnugrep
          gawk
          
          # File management
          findutils
          which
          file
          
          # System monitoring
          lsof
          strace
        ];
        
        # Core development dependencies
        systemDeps = with pkgs; [
          # Essential system tools
          bash
          
          # Node.js ecosystem
          nodejs
          nodePackages.npm
          nodePackages.pnpm
          gemini-cli
          yarn
          
          # Database - PostgreSQL 15 (good for Debian 12)
          postgresql_15
          
          # Version control and networking
          git
          curl
          wget
          
          # Build essentials for native modules
          gcc
          gnumake
          python3
          pkg-config
          autoconf
          automake
          libtool
          
          # Image processing (Next.js optimization)
          vips
          imagemagick
          
          # Playwright for E2E testing
          playwright-driver.browsers
          
          # Development utilities
          jq                 # JSON processing
          tree               # Directory visualization
          fd                 # Modern find
          ripgrep           # Fast grep
          bat               # Enhanced cat
          
          # SSL/TLS support
          openssl
          
          # API development
          httpie
          
          # File watching (Linux-optimized)
          watchman
          inotify-tools
          
          # Process management
          tmux
          htop
          
          # Container support
          docker-compose
          
          # Editor support
          vim
          nano
        ] ++ linuxDeps;

        # Environment variables optimized for Debian 12
        shellEnvVars = {
          # Node.js configuration
          NODE_ENV = "development";
          
          # PostgreSQL configuration for Debian
          PGDATA = "$PWD/.postgres";
          PGHOST = "localhost";
          PGPORT = "5432";
          PGDATABASE = "development";
          PGUSER = "development";
          
          # Database connection
          DATABASE_URL = "postgresql://development:development@localhost:5432/development";
          
          # Next.js optimizations
          TURBOPACK = "1";
          
          # Playwright configuration
          PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          
          # Linux/Debian optimizations
          FORCE_COLOR = "1";
          TERM = "xterm-256color";
          
          # Memory settings for x86_64
          NODE_OPTIONS = "--max-old-space-size=8192";  # More memory for x86_64 systems
          
          # Locale settings for Debian
          LANG = "en_US.UTF-8";
          LC_ALL = "en_US.UTF-8";
        };

        # Debian-optimized setup script
        devScripts = pkgs.writeShellScriptBin "dev-setup" ''
          #!/bin/bash
          set -e
          
          echo "🐧 Setting up Debian 12 development environment..."
          echo "🏗️  Architecture: x86_64"
          echo "📦 Distribution: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Debian-based")"
          
          # Temporarily unset PGUSER to avoid confusion
          unset PGUSER
          
          # Check for required system packages
          echo "🔍 Checking system dependencies..."
          
          # Check if we have the basic build tools
          if ! command -v gcc &> /dev/null; then
            echo "⚠️  GCC not found. Make sure build-essential is installed:"
            echo "   sudo apt update && sudo apt install build-essential"
          fi
          
          # Initialize PostgreSQL if not exists
          if [ ! -d "$PGDATA" ]; then
            echo "🐘 Initializing PostgreSQL database..."
            
            # Create .postgres directory with proper permissions
            mkdir -p "$PGDATA"
            chmod 700 "$PGDATA"
            
            # Initialize database cluster
            initdb \
              --auth-local=trust \
              --auth-host=md5 \
              --encoding=UTF8 \
              --locale=en_US.UTF-8 \
              --username=$(whoami) \
              --pwfile=<(echo "postgres")
            
            # Debian/Linux-specific PostgreSQL configuration
            cat >> "$PGDATA/postgresql.conf" << 'EOF'
# Debian 12 optimized settings
port = 5432
unix_socket_directories = '$PWD/.postgres'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Logging configuration
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'none'
log_min_duration_statement = -1
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Linux-specific optimizations
dynamic_shared_memory_type = posix
EOF
            
            # Set up client authentication for local development
            cat > "$PGDATA/pg_hba.conf" << 'EOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
host    all             all             0.0.0.0/0               md5
EOF
          fi
          
          # Start PostgreSQL
          if ! pg_ctl status -D "$PGDATA" > /dev/null 2>&1; then
            echo "🚀 Starting PostgreSQL..."
            
            # Ensure log directory exists
            mkdir -p "$PGDATA/log"
            
            pg_ctl start \
              -D "$PGDATA" \
              -l "$PGDATA/log/postgresql.log" \
              -o "-F -p 5432"
            
            # Wait for PostgreSQL to be ready
            echo "⏳ Waiting for PostgreSQL to start..."
            timeout=30
            while ! pg_isready -h localhost -p 5432 > /dev/null 2>&1 && [ $timeout -gt 0 ]; do
              sleep 1
              timeout=$((timeout - 1))
              echo -n "."
            done
            echo ""
            
            if [ $timeout -eq 0 ]; then
              echo "❌ PostgreSQL failed to start within 30 seconds"
              echo "📋 Check logs: cat $PGDATA/log/postgresql.log"
              exit 1
            fi
            
            echo "✅ PostgreSQL started successfully"
          else
            echo "✅ PostgreSQL is already running"
          fi
          
          # Database setup
          DEFAULT_USER=$(whoami)
          
          echo "👤 Setting up database users and permissions..."
          
          # Create development user if it doesn't exist
          if ! psql -h localhost -p 5432 -d postgres -U "$DEFAULT_USER" \
               -c "SELECT 1 FROM pg_user WHERE usename = 'development';" 2>/dev/null | grep -q 1; then
            echo "🔧 Creating development user..."
            psql -h localhost -p 5432 -d postgres -U "$DEFAULT_USER" \
              -c "CREATE USER development WITH PASSWORD 'development' CREATEDB CREATEROLE;"
          fi
          
          # Create development database if it doesn't exist
          if ! psql -h localhost -p 5432 -d postgres -U "$DEFAULT_USER" \
               -lqt | cut -d \| -f 1 | grep -qw development; then
            echo "🏗️  Creating development database..."
            createdb -h localhost -p 5432 -U "$DEFAULT_USER" \
              -O development development \
              -E UTF8 -l en_US.UTF-8
          fi
          
          # Set up permissions
          echo "🔐 Configuring permissions..."
          psql -h localhost -p 5432 -d development -U "$DEFAULT_USER" << 'EOF'
GRANT ALL PRIVILEGES ON DATABASE development TO development;
GRANT ALL ON SCHEMA public TO development;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO development;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO development;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO development;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO development;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO development;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO development;
EOF
          
          # Test connection
          echo "🧪 Testing database connection..."
          psql -h localhost -p 5432 -d development -U development \
            -c "SELECT 'Database connection successful!' as status, version();" \
            || echo "⚠️  Database connection test failed"
          
          # Create environment file
          if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
            echo "📝 Creating .env.local from template..."
            cp .env.example .env.local
            echo "DATABASE_URL=postgresql://development:development@localhost:5432/development" >> .env.local
          elif [ ! -f ".env.local" ]; then
            echo "📝 Creating basic .env.local..."
            cat > .env.local << 'EOF'
# Database
DATABASE_URL=postgresql://development:development@localhost:5432/development

# Development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Add your environment variables here
EOF
          fi
          
          # Linux desktop notification
          if command -v notify-send &> /dev/null; then
            notify-send "Development Environment" \
              "Debian 12 setup complete! 🚀" \
              --icon=dialog-information \
              --expire-time=5000 || true
          fi
          
          echo ""
          echo "🎉 Debian 12 development environment ready!"
          echo ""
          echo "📊 System Information:"
          echo "  • OS: $(lsb_release -d 2>/dev/null | cut -f2 || uname -o)"
          echo "  • Kernel: $(uname -r)"
          echo "  • Architecture: $(uname -m)"
          echo "  • CPU: $(nproc) cores"
          echo "  • Memory: $(free -h | awk '/^Mem:/ {print $2}') total"
          echo ""
          echo "🔧 Development Stack:"
          echo "  • Node.js: $(node --version)"
          echo "  • npm: $(npm --version)"
          echo "  • pnpm: $(pnpm --version)"
          echo "  • PostgreSQL: $(postgres --version | head -n1 | cut -d' ' -f3)"
          echo "  • Database: development@localhost:5432"
          echo ""
          echo "🚀 Quick Start:"
          echo "  1. npm install                 # Install dependencies"
          echo "  2. npm run dev                 # Start development server"
          echo "  3. npm run db:push             # Push database schema (if using Drizzle)"
          echo ""
          echo "🛠️  Available Commands:"
          echo "  • dev-stop          - Stop all services"
          echo "  • dev-logs          - View PostgreSQL logs"
          echo "  • dev-status        - Check service status"
          echo "  • dev-reset         - Reset database (⚠️  destroys data)"
          echo ""
          echo "🔗 Connection URL:"
          echo "  postgresql://development:development@localhost:5432/development"
          echo ""
          echo "🧪 Test connection:"
          echo "  psql 'postgresql://development:development@localhost:5432/development'"
        '';

        # Stop services script
        stopScript = pkgs.writeShellScriptBin "dev-stop" ''
          #!/bin/bash
          echo "🛑 Stopping development services..."
          
          # Stop PostgreSQL
          if pg_ctl status -D "$PGDATA" > /dev/null 2>&1; then
            echo "🐘 Stopping PostgreSQL..."
            pg_ctl stop -D "$PGDATA" -m fast
            echo "✅ PostgreSQL stopped"
          else
            echo "ℹ️  PostgreSQL was not running"
          fi
          
          # Stop Node.js development servers
          echo "🔍 Stopping Node.js processes..."
          pkill -f "next-server" 2>/dev/null || true
          pkill -f "turbopack" 2>/dev/null || true
          pkill -f "webpack" 2>/dev/null || true
          
          # Notification
          if command -v notify-send &> /dev/null; then
            notify-send "Development Environment" \
              "Services stopped 🛑" \
              --icon=dialog-information || true
          fi
          
          echo "✅ All development services stopped"
        '';

        # Status check script
        statusScript = pkgs.writeShellScriptBin "dev-status" ''
          #!/bin/bash
          echo "📊 Development Environment Status"
          echo "=================================="
          echo ""
          
          # System info
          echo "🖥️  System:"
          echo "  • OS: $(lsb_release -d 2>/dev/null | cut -f2 || uname -o)"
          echo "  • Kernel: $(uname -r)"
          echo "  • Uptime: $(uptime -p 2>/dev/null || uptime)"
          echo "  • Load: $(uptime | awk -F'load average:' '{print $2}')"
          echo ""
          
          # PostgreSQL status
          echo "🐘 PostgreSQL:"
          if pg_ctl status -D "$PGDATA" > /dev/null 2>&1; then
            echo "  • Status: ✅ Running"
            echo "  • Port: 5432"
            echo "  • Data Dir: $PGDATA"
            echo "  • Version: $(postgres --version | cut -d' ' -f3)"
            
            # Connection test
            if psql -h localhost -p 5432 -d development -U development -c "SELECT 1;" > /dev/null 2>&1; then
              echo "  • Connection: ✅ OK"
            else
              echo "  • Connection: ❌ Failed"
            fi
          else
            echo "  • Status: ❌ Stopped"
          fi
          echo ""
          
          # Node.js processes
          echo "🟢 Node.js Processes:"
          NODE_PROCS=$(pgrep -f "node" 2>/dev/null || true)
          if [ -n "$NODE_PROCS" ]; then
            ps aux | head -n1
            ps aux | grep -E "(node|next|turbo)" | grep -v grep || echo "  • No Node.js processes running"
          else
            echo "  • No Node.js processes running"
          fi
          echo ""
          
          # Disk space
          echo "💾 Disk Space:"
          df -h . | tail -n1 | awk '{print "  • Available: " $4 " (" $5 " used)"}'
          echo ""
          
          # Memory usage
          echo "🧠 Memory:"
          free -h | awk 'NR==2{print "  • Used: " $3 "/" $2 " (" $3/$2*100 "%)"}' 2>/dev/null || true
          echo ""
          
          # Network ports
          echo "🌐 Network:"
          if command -v ss &> /dev/null; then
            echo "  • Listening ports:"
            ss -tlnp | grep -E ":(3000|5432|8080)" | awk '{print "    " $1 " " $4}' || echo "    No development ports active"
          elif command -v netstat &> /dev/null; then
            echo "  • Listening ports:"
            netstat -tlnp 2>/dev/null | grep -E ":(3000|5432|8080)" | awk '{print "    " $1 " " $4}' || echo "    No development ports active"
          fi
        '';

        # Logs viewing script
        logsScript = pkgs.writeShellScriptBin "dev-logs" ''
          #!/bin/bash
          echo "📋 Development Environment Logs"
          echo "==============================="
          echo ""
          
          # PostgreSQL logs
          echo "🐘 PostgreSQL Logs (last 30 lines):"
          echo "-----------------------------------"
          if [ -f "$PGDATA/log/postgresql.log" ]; then
            tail -n 30 "$PGDATA/log/postgresql.log"
          elif [ -f "$PGDATA/postgresql.log" ]; then
            tail -n 30 "$PGDATA/postgresql.log"
          else
            echo "No PostgreSQL logs found"
            echo "Expected locations:"
            echo "  • $PGDATA/log/postgresql.log"
            echo "  • $PGDATA/postgresql.log"
          fi
          echo ""
          
          # System logs related to our services
          echo "🔍 Recent System Activity:"
          echo "-------------------------"
          if command -v journalctl &> /dev/null; then
            journalctl --user -n 10 --no-pager 2>/dev/null || echo "No user journal available"
          else
            echo "journalctl not available"
          fi
          echo ""
          
          # Process information
          echo "⚡ Active Processes:"
          echo "------------------"
          ps aux | head -n1
          ps aux | grep -E "(postgres|node|next)" | grep -v grep || echo "No development processes running"
        '';

        # Database reset script
        resetScript = pkgs.writeShellScriptBin "dev-reset" ''
          #!/bin/bash
          echo "🔄 Development Database Reset"
          echo "=============================="
          echo ""
          echo "⚠️  WARNING: This will completely destroy all data in your development database!"
          echo "⚠️  This action cannot be undone!"
          echo ""
          echo "Database to be reset: development@localhost:5432"
          echo ""
          read -p "Are you absolutely sure? Type 'yes' to continue: " -r
          echo ""
          
          if [[ $REPLY == "yes" ]]; then
            echo "🛑 Stopping services..."
            dev-stop
            sleep 2
            
            echo "🗑️  Removing database directory..."
            rm -rf "$PGDATA"
            
            echo "🗑️  Removing environment file..."
            rm -f .env.local
            
            echo "🚀 Reinitializing environment..."
            dev-setup
            
            echo ""
            echo "✅ Database reset complete!"
          else
            echo "❌ Reset cancelled - no changes made"
          fi
        '';

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = systemDeps ++ [ devScripts stopScript statusScript logsScript resetScript ];
          
          shellHook = ''
            # Set environment variables for Debian 12
            ${builtins.concatStringsSep "\n" (
              pkgs.lib.mapAttrsToList (name: value: "export ${name}=\"${value}\"") shellEnvVars
            )}
            
            # Create necessary directories
            mkdir -p .postgres
            mkdir -p .nix/bin
            mkdir -p node_modules/.cache
            
            # Linux-specific ulimit adjustments
            ulimit -n 65536 2>/dev/null || true
            ulimit -u 32768 2>/dev/null || true
            
            # Set up proper locale if not set
            if [ -z "$LANG" ]; then
              export LANG=en_US.UTF-8
            fi
            
            # Welcome message
            echo "🐧 Next.js 15 Full-Stack Development Environment"
            echo "🖥️  Platform: Debian 12 ($(uname -m))"
            echo "📁 Project: $(basename $PWD)"
            echo "🏠 Home: $HOME"
            echo ""
            echo "🔧 Development Stack:"
            echo "  • Node.js: $(node --version)"
            echo "  • npm: $(npm --version)"
            echo "  • pnpm: $(pnpm --version)"
            echo "  • PostgreSQL: $(postgres --version | head -n1 | cut -d' ' -f3)"
            echo "  • Platform: Linux $(uname -r)"
            echo ""
            echo "🚀 Getting Started:"
            echo "  1. dev-setup              # Initialize development environment"
            echo "  2. npm install            # Install project dependencies"
            echo "  3. npm run dev            # Start development server"
            echo ""
            echo "🛠️  Management Commands:"
            echo "  • dev-setup       - Initialize/setup development environment"
            echo "  • dev-status      - Check status of all services"
            echo "  • dev-stop        - Stop all development services"
            echo "  • dev-logs        - View service logs"
            echo "  • dev-reset       - Reset database (⚠️  destroys all data)"
            echo ""
            echo "💡 Run 'dev-setup' to initialize your development environment!"
          '';
          
          NIX_CONFIG = "experimental-features = nix-command flakes";
        };

        # CI/CD shell for automated environments
        devShells.ci = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            git
            postgresql_15
            bash
            coreutils
            gnused
            gnugrep
          ];
          shellHook = ''
            export NODE_ENV=test
            export CI=true
            export DEBIAN_FRONTEND=noninteractive
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
          '';
        };

        # Production shell for deployment
        devShells.production = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            postgresql_15
            openssl
            bash
            coreutils
          ];
          shellHook = ''
            export NODE_ENV=production
            export NODE_OPTIONS="--max-old-space-size=4096"
          '';
        };
      }
    );
}
