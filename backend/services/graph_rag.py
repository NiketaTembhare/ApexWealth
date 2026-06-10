import json
import logging
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from services.db import GraphEdge
import networkx as nx

logger = logging.getLogger("graph-rag-service")

def build_transaction_graph_edges(
    transactions: List[Dict],
    user_id: int,
    db: Session
):
    """
    Parses transaction rows and records relation edges in the SQLite database.
    Creates User -> Transaction, Transaction -> Vendor, and Transaction -> Compliance edges.
    """
    try:
        # Clear existing edges for this user to keep it clean
        db.query(GraphEdge).filter(GraphEdge.user_id == user_id).delete()
        
        edges = []
        
        for i, tx in enumerate(transactions):
            tx_id = f"tx_{tx.get('date', '00')}_{i}"
            vendor_name = tx.get("description", "Unknown Vendor").strip()
            
            # Normalize vendor name for linking (e.g. "Swiggy Order #123" -> "Swiggy")
            vendor_normalized = vendor_name.split()[0].split('-')[0].split('#')[0].strip()
            if len(vendor_normalized) < 3:
                vendor_normalized = vendor_name
                
            amount = tx.get("amount", 0.0)
            
            # 1. User --[owns]--> Transaction
            edges.append(GraphEdge(
                user_id=user_id,
                source_id=f"user_{user_id}",
                source_type="User",
                target_id=tx_id,
                target_type="Transaction",
                relation_type="owns"
            ))
            
            # 2. Transaction --[paid_to]--> Vendor
            edges.append(GraphEdge(
                user_id=user_id,
                source_id=tx_id,
                source_type="Transaction",
                target_id=f"vendor_{vendor_normalized.lower()}",
                target_type="Vendor",
                relation_type="paid_to"
            ))
            
            # 3. Anomaly conditions -> violates -> ComplianceRule
            if amount > 50000.0:
                edges.append(GraphEdge(
                    user_id=user_id,
                    source_id=tx_id,
                    source_type="Transaction",
                    target_id="rule_rbi_50k_pan",
                    target_type="ComplianceRule",
                    relation_type="violates"
                ))
            if tx.get("category") == "Entertainment" and amount > 5000.0:
                edges.append(GraphEdge(
                    user_id=user_id,
                    source_id=tx_id,
                    source_type="Transaction",
                    target_id="rule_savings_efficiency",
                    target_type="ComplianceRule",
                    relation_type="violates"
                ))
                
        if edges:
            db.bulk_save_objects(edges)
            db.commit()
            logger.info(f"Successfully loaded {len(edges)} relation edges to SQLite graph database.")
    except Exception as e:
        logger.error(f"Failed to build transaction graph: {e}")
        db.rollback()

def get_graph_elements_payload(user_id: int, db: Session) -> Dict:
    """
    Queries SQLite GraphEdge records and constructs a NetworkX graph representation.
    Returns nodes and edges formatted in Cytoscape-compatible JSON for frontend rendering.
    """
    edges_db = db.query(GraphEdge).filter(GraphEdge.user_id == user_id).all()
    
    # Setup NetworkX graph
    G = nx.DiGraph()
    
    # Track node details to avoid duplicates
    node_map = {}
    
    # Add seed node info for user and rules
    node_map[f"user_{user_id}"] = {"label": f"User (ID: {user_id})", "type": "User"}
    node_map["rule_rbi_50k_pan"] = {"label": "RBI INR 50k PAN Limit", "type": "ComplianceRule"}
    node_map["rule_savings_efficiency"] = {"label": "Budget Savings Rules", "type": "ComplianceRule"}
    
    for edge in edges_db:
        # Add source node
        src_id = edge.source_id
        if src_id not in node_map:
            label = src_id.replace("tx_", "TX: ").replace("vendor_", "").title()
            node_map[src_id] = {"label": label, "type": edge.source_type}
            
        # Add target node
        tgt_id = edge.target_id
        if tgt_id not in node_map:
            label = tgt_id.replace("tx_", "TX: ").replace("vendor_", "").title()
            node_map[tgt_id] = {"label": label, "type": edge.target_type}
            
        G.add_edge(src_id, tgt_id, relation=edge.relation_type)
        
    # Build payload arrays
    nodes_list = []
    for node_id, data in node_map.items():
        # Only export connected nodes
        if G.has_node(node_id) or node_id == f"user_{user_id}":
            nodes_list.append({
                "id": node_id,
                "label": data["label"],
                "type": data["type"]
            })
            
    edges_list = []
    for u, v, d in G.edges(data=True):
        edges_list.append({
            "source": u,
            "target": v,
            "relation": d.get("relation", "related_to")
        })
        
    return {
        "nodes": nodes_list,
        "edges": edges_list
    }
