import json
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score
import umap
import numpy as np
from sklearn.preprocessing import StandardScaler

columns = ['individualCount','decimalLatitude','decimalLongitude','depth','taxonKey',
            'kingdomKey','phylumKey','familyKey','genusKey']

occur_df = pd.read_csv('occurrence.txt', delimiter='\t', low_memory=False)
occur_df = occur_df[['gbifID',     
                    'individualCount',
                    # 'organismQuantity', #commented because too many nulls
                    'decimalLatitude',
                    'decimalLongitude',
                    'depth',
                    'taxonKey',
                    'kingdomKey',    
                    'phylumKey',   
                    'familyKey',   
                    'genusKey']]
occur_df = occur_df.dropna() # no null data

multimedia_df = pd.read_csv('multimedia.txt', delimiter='\t')
multimedia_df = multimedia_df[['gbifID', 'identifier']]
multimedia_df = multimedia_df.dropna()

# Add multimedia link based on the ID
occur_df['identifier'] = np.full(shape=occur_df.shape[0], fill_value=None)
for i in range(0, occur_df.shape[0]):
    gbifID_value = occur_df.iloc[i]['gbifID']
    target = multimedia_df.loc[multimedia_df['gbifID'] == gbifID_value]
    if (target.size != 0):
        occur_df.loc[occur_df.index[i], 'identifier'] = target['identifier'].values[0]

df = occur_df[columns];

#! standarize
df = StandardScaler().fit_transform(df)
df = pd.DataFrame(data=df, columns=columns)
X2 = df.to_numpy()

#! predict
bestK = 2
maxSil = -2
for k in range(2, 11):
  kmeans = KMeans(n_clusters = k).fit(df[columns])
  labels = kmeans.labels_
  result = silhouette_score(df[columns], labels, metric = 'euclidean')
  if result > maxSil:
     maxSil = result 
     bestK = k

km = KMeans(n_clusters=bestK) 
y2 = km.fit_predict(df[columns]) 

# ! UMAP adjustment
umap_model = umap.UMAP(n_components=2, random_state=42)
X_umap = umap_model.fit_transform(X2) 

umap_df = pd.DataFrame(data=X_umap, columns=['UMAP1', 'UMAP2'])
umap_df['cluster'] = y2
json_data = umap_df.to_dict(orient='records')
with open('kmeans.json', 'w') as f:
    json.dump(json_data, f)