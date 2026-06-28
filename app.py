import argparse
import os
import sys

from logger import get_logger
from modules import get_module, get_module_menu
from settings import settings

logger = get_logger()


def print_banner():
    print("\n=========================")
    print("      ForgeIQ OS")
    print("=========================")
    for key, name, description in get_module_menu():
        print(f"{key}. {name} - {description}")
    print("s. Settings")
    print("q. Quit")


def pause():
    if not sys.stdin.isatty():
        print("")
        return
    input("\nPress Enter to return to the menu...")


def handle_settings():
    print("\nCurrent settings:")
    for key in sorted(settings._settings):
        print(f"- {key} = {settings._settings[key]}")

    print("\nType a setting name to update it, or press Enter to cancel.")
    choice = input("Setting name: ").strip()
    if not choice:
        return

    value = input(f"New value for {choice}: ").strip()
    if not value:
        return

    settings.set(choice, value)
    print(f"Updated {choice}.")


def run_choice(choice):
    if choice == "s":
        handle_settings()
        return

    module = get_module(choice)
    if module is None:
        print("Invalid selection.")
        return

    logger.info("Running module %s", module.name)
    module.run()


def parse_args():
    parser = argparse.ArgumentParser(description="ForgeIQ launcher")
    parser.add_argument(
        "--option",
        help="Run a specific module key without entering the interactive menu.",
    )
    parser.add_argument(
        "--setting",
        nargs=2,
        metavar=("NAME", "VALUE"),
        help="Set a configuration variable and persist it to .env.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    if args.setting:
        name, value = args.setting
        settings.set(name, value)
        print(f"Updated {name}.")
        return

    if args.option:
        run_choice(args.option)
        return

    while True:
        print_banner()
        choice = input("Select option: ").strip().lower()
        if choice in {"q", "quit", "exit"}:
            print("Goodbye.")
            return
        print("")
        try:
            run_choice(choice)
        except Exception as exc:
            print(f"Error: {exc}")
        pause()


if __name__ == "__main__":
    main()
