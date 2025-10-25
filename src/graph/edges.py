# Basit edge tanımlamaları (graph bağlantıları)
class Edge:
    def __init__(self, from_node, to_node):
        self.from_node = from_node
        self.to_node = to_node

    def connect(self):
        return f"{self.from_node} -> {self.to_node}"
