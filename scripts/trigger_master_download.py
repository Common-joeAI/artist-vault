#!/usr/bin/env python3
"""
trigger_master_download.py
Called after a catalog import (DistroKid/SoundOn) to kick off master downloads
for a specific user in the background.
Usage: python3 trigger_master_download.py <user-id>
"""
import sys, subprocess, os

if len(sys.argv) < 2:
    print("Usage: trigger_master_download.py <user-id>")
    sys.exit(1)

user_id = sys.argv[1]
script  = '/opt/containers/artist-vault/scripts/download_masters.py'
log     = f'/tmp/masters_{user_id[:8]}.log'

# Run detached so caller returns immediately
subprocess.Popen(
    ['python3', script, '--user-id', user_id],
    stdout=open(log, 'w'),
    stderr=subprocess.STDOUT,
    start_new_session=True
)
print(f"Master download triggered for user {user_id}, logging to {log}")
