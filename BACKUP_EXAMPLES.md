# Automated Backup Examples

This file contains examples for setting up automated backups of your Task Tracker data.

## Daily Backups with Cron (Linux/macOS)

Add this to your crontab (`crontab -e`):

```bash
# Backup Task Tracker data daily at 2 AM, keep last 30 days
0 2 * * * cd /Users/jelle.vanelburg/Git-repos/private/task_track && /usr/local/bin/deno task backup:keep >> /tmp/task-tracker-backup.log 2>&1
```

## Weekly Backups (alternative)

```bash
# Backup every Sunday at 3 AM
0 3 * * 0 cd /Users/jelle.vanelburg/Git-repos/private/task_track && /usr/local/bin/deno task backup >> /tmp/task-tracker-backup.log 2>&1
```

## Manual Cleanup

If you want to manually clean up old backups:

```bash
# Keep only the 10 most recent backups
cd /Users/jelle.vanelburg/Git-repos/private/task_track
deno run --allow-env --allow-read --allow-write tools/backup.ts --keep 10
```

## Pre-Development Backup

Create a simple alias in your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
alias tt-dev='cd ~/Git-repos/private/task_track && deno task backup && ./start-dev.sh'
```

Now `tt-dev` will create a backup before starting development.

## Backup Before Risky Operations

```bash
# Before running debug commands or making major changes
deno task backup

# Then proceed with your changes
curl -X POST http://localhost:3001/api/debug/clear-tasks
```

## Restoring from Backup

1. List available backups:
```bash
deno task backup:list
```

2. Restore a specific backup:
```bash
deno run --allow-env --allow-read --allow-write tools/backup.ts --restore 2024-01-15_14-30-00
```

Note: The current state is automatically backed up before restore, so you can undo if needed.

## Finding Deno Path

If you're unsure where Deno is installed:

```bash
which deno
```

Use this full path in your cron jobs for reliability.
