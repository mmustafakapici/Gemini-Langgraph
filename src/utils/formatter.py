from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.table import Table
from rich.text import Text

console = Console()


def format_source_tag(source: str) -> str:
    mapping = {
        "chroma_db": "[green]RAG[/green]",
        "web_search": "[yellow]WEB[/yellow]",
        "generic_llm": "[cyan]LLM[/cyan]",
    }
    return mapping.get(source, "[white]UNKNOWN[/white]")


def pretty_answer(answer: str, halluc_score: float, grade: float, source: str, docs_count: int):
    """Tüm yanıt çıktısını profesyonel bir panel halinde gösterir."""

    if not answer or answer.strip() == "":
        answer = "⛔ Bir cevap üretilemedi."

    # Üst başlık: Kaynak tipi
    title = Text(f" {format_source_tag(source)} | AI Response ", style="bold white")

    answer_md = Markdown(answer)

    # Alt bilgi
    subtitle = (
        f"Hallucination: [magenta]{halluc_score:.2f}[/magenta] | "
        f"Grade: [cyan]{grade:.2f}[/cyan] | "
        f"Docs: [green]{docs_count}[/green]"
    )

    console.print(Panel(answer_md, title=title, subtitle=subtitle, border_style="cyan", expand=True))


def print_docs_info(docs: list):
    """RAG kullanılan belge sayısını özet olarak yazdırır."""
    if not docs:
        return

    table = Table(title="📚 Retrieved Documents", show_header=True, header_style="bold green")
    table.add_column("Index", justify="center")
    table.add_column("Document Preview", justify="left")

    for idx, d in enumerate(docs, start=1):
        preview = d[:80].replace("\n", " ") + ("..." if len(d) > 80 else "")
        table.add_row(str(idx), preview)

    console.print(table)
