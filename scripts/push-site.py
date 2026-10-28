"""Push Sites source; credentials arrive over stdin and remain only in memory."""
import json, os, subprocess, sys
if sys.stdin.isatty():
    import termios
    settings = termios.tcgetattr(sys.stdin)
    settings[3] &= ~termios.ECHO
    termios.tcsetattr(sys.stdin, termios.TCSANOW, settings)
print('Ready for source credential on stdin (hidden).', flush=True)
credential = json.loads(sys.stdin.readline())
env = os.environ.copy()
env['GIT_TERMINAL_PROMPT'] = '0'
if credential.get('auth_mode') != 'work_proxy':
    env['GIT_CONFIG_COUNT'] = '1'
    env['GIT_CONFIG_KEY_0'] = 'http.extraHeader'
    env['GIT_CONFIG_VALUE_0'] = 'Authorization: Bearer ' + credential['token']
subprocess.run(['git','push',credential['remote_url'],'HEAD:'+credential['branch']],env=env,check=True)
