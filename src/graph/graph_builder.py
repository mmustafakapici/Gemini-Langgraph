from src.graph.nodes import (
    RetrieverNode, RetrieverGraderNode,
    GeneratorNode, HallucinationNode, AnswerGraderNode
)
from src.graph.edges import Edge
from src.utils.logger import log_info

class RAGGraph:
    def __init__(self):
        log_info("LangGraph pipeline initialized.")
        self.retriever = RetrieverNode()
        self.retriever_grader = RetrieverGraderNode()
        self.generator = GeneratorNode()
        self.hallucination = HallucinationNode()
        self.answer_grader = AnswerGraderNode()
        self.edges = [
            Edge("Retriever", "RetrieverGrader"),
            Edge("RetrieverGrader", "Generator"),
            Edge("Generator", "Hallucination"),
            Edge("Hallucination", "AnswerGrader"),
        ]

    def describe(self):
        print("\n📊 Graph Structure:")
        for e in self.edges:
            print(f" - {e.connect()}")
        print("")
