import pandas as pd
import ast

df = pd.read_csv('data/output_1w_merged.csv')

nodes = []
edges = []

for idx, row in df.iterrows():
    node_id = row['id'].split('/')[-1]
    title = row['title']
    try:
        topics = ast.literal_eval(row['topics'])  # topics 为 JSON 字符串
        # 取第一个 domain，或拼接多个也可
        if isinstance(topics, list) and len(topics) > 0:
            domain = topics[0].get('domain', 'Unknown')
        else:
            domain = 'Unknown'
    except Exception:
        domain = 'Unknown'
    nodes.append({'id': node_id, 'title': title, 'domain': domain})

    # 提取引用边
    try:
        refs = ast.literal_eval(row['referenced_works'])
        for ref_url in refs:
            ref_id = ref_url.split('/')[-1]
            edges.append({'source': node_id, 'target': ref_id})
    except Exception:
        continue

pd.DataFrame(nodes).to_csv('data/nodes.csv', index=False)
pd.DataFrame(edges).to_csv('data/edges.csv', index=False)
print('Done.')
