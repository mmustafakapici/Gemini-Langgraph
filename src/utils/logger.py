from colorama import Fore, Style, init
init(autoreset=True)

from datetime import datetime

def _ts():
    return datetime.now().strftime('%H:%M:%S')

def log_info(msg: str):
    print(Fore.CYAN + f"[{_ts()}][INFO] " + Style.RESET_ALL + msg)

def log_success(msg: str):
    print(Fore.GREEN + f"[{_ts()}][SUCCESS] " + Style.RESET_ALL + msg)

def log_warning(msg: str):
    print(Fore.YELLOW + f"[{_ts()}][WARNING] " + Style.RESET_ALL + msg)

def log_error(msg: str):
    print(Fore.RED + f"[{_ts()}][ERROR] " + Style.RESET_ALL + msg)
