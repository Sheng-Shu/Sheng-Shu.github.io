import pandas as pd

# 读取原始 CSV 文件
<<<<<<< HEAD
input_path = "data/openalex-mena_dataset_merged.csv"
=======
input_path = "data/output_1w_merged.csv"
>>>>>>> 0a81ba2e0abfa8bc95af9ebc62263c8026f89ad1
df = pd.read_csv(input_path)

# 保留的字段
fields_to_keep = [
    "id", "title", "cited_by_count", "referenced_works", "topics"
]

# 筛选字段
cleaned_df = df[fields_to_keep]

# 保存为新文件
output_path = "data/nodes_cleaned.csv"
cleaned_df.to_csv(output_path, index=False)