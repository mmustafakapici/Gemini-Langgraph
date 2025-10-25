from rich.console import Console
from rich.panel import Panel
from rich.text import Text

console = Console()

def pretty_answer(answer: str, halluc_score: float, grade: float):
    header = Text("AI Answer", style="bold cyan")
    content = Text(answer, style="white")
    info = f"\nHallucination: {halluc_score} | Grade: {grade}"
    console.print(Panel(content, title=header, subtitle=info, border_style="cyan"))
