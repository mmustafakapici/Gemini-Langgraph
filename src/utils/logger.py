from colorama import Fore, Style, init
init(autoreset=True)

def log_info(msg: str):
    print(Fore.CYAN + "[INFO] " + Style.RESET_ALL + msg)

def log_success(msg: str):
    print(Fore.GREEN + "[SUCCESS] " + Style.RESET_ALL + msg)

def log_warning(msg: str):
    print(Fore.YELLOW + "[WARNING] " + Style.RESET_ALL + msg)

def log_error(msg: str):
    print(Fore.RED + "[ERROR] " + Style.RESET_ALL + msg)
