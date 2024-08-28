from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score
import umap
import numpy as np
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

def get_records(columns):
    columns = ['gbifID']+columns
    occur_df = pd.read_csv('occurrence.txt', delimiter='\t', low_memory=False)
    occur_df = occur_df[columns]
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

    return occur_df


def standarize(df, columns):
    df = StandardScaler().fit_transform(df)
    df = pd.DataFrame(data=df, columns=columns)
    X2 = df.to_numpy()
    return X2,df

def get_best_k(type, df, columns, params):
    bestK = 2
    maxSil = -2
    for k in range(2, 11):
        clustering = KMeans(n_clusters=k, 
                        init=params.get("init", 'k-means++'), 
                        n_init=params.get("n_init", 'auto'), 
                        max_iter=params.get("max_iter", 300), 
                        tol=params.get("tol", 0.0001), 
                        verbose=params.get("verbose", 0), 
                        random_state=params.get("random_state", None), 
                        copy_x=params.get("copy_x", True), 
                        algorithm=params.get("algorithm", 'lloyd')).fit(df[columns]) if type == "kmeans" else (
                    AgglomerativeClustering(n_clusters=k, 
                        metric=params.get("metric", 'euclidean'), 
                        memory=params.get("memory", None), 
                        connectivity=params.get("connectivity", None), 
                        compute_full_tree=params.get("compute_full_tree", 'auto'), 
                        linkage=params.get("linkage", 'ward'), 
                        distance_threshold=params.get("distance_threshold", None), 
                        compute_distances=params.get("compute_distances", False)).fit(df[columns]))
        labels = clustering.labels_
        result = silhouette_score(df[columns], labels, metric = 'euclidean')
        # print(' result: ', result, ' bestK: ', bestK, ' k: ', k)
        if result > maxSil:
            maxSil = result 
            bestK = k
    return bestK

def clustering(type, df, columns, params):
    bestK = params.get("n_clusters", None)
    if bestK == None:
        bestK = get_best_k(type, df, columns, params)
    clustering = KMeans(n_clusters=bestK, 
                        init=params.get("init", 'k-means++'), 
                        n_init=params.get("n_init", 'auto'), 
                        max_iter=params.get("max_iter", 300), 
                        tol=params.get("tol", 0.0001), 
                        verbose=params.get("verbose", 0), 
                        random_state=params.get("random_state", None), 
                        copy_x=params.get("copy_x", True), 
                        algorithm=params.get("algorithm", 'lloyd')) if type == "kmeans" else (
                    AgglomerativeClustering(
                        n_clusters=bestK,
                        metric=params.get("metric", 'euclidean'), 
                        memory=params.get("memory", None), 
                        connectivity=params.get("connectivity", None), 
                        compute_full_tree=params.get("compute_full_tree", 'auto'), 
                        linkage=params.get("linkage", 'ward'), 
                        distance_threshold=params.get("distance_threshold", None), 
                        compute_distances=params.get("compute_distances", False)) if type == "hierarquical" else 
                    DBSCAN(eps=params.get("eps", 0.5),  
                        min_samples=params.get("min_samples", 5), 
                        metric=params.get("metric", 'euclidean'), 
                        metric_params=params.get("metric_params", None), 
                        algorithm=params.get("algorithm", 'auto'), 
                        leaf_size=params.get("leaf_size", 30), 
                        p=params.get("p", None), 
                        n_jobs=params.get("n_jobs", None))
                )
    y2 = clustering.fit_predict(df[columns]) 
    return y2, bestK

def do_umap(X2):
    umap_model = umap.UMAP(n_components=2, random_state=42)
    X_umap = umap_model.fit_transform(X2) 
    return X_umap


@app.route('/do_cluster', methods=['POST'])
def do_cluster():
    print('called the backend')
    print('request.json', request.json)
    type = request.json.get('type')
    params = request.json.get('paramsAPI', {})

    print(type, params)

    columns = ['individualCount','decimalLatitude','decimalLongitude','depth','taxonKey',
                'kingdomKey','phylumKey','familyKey','genusKey']
    occur_df = get_records(columns)

    X2,df = standarize(occur_df[columns], columns)
    y2, bestK = clustering(type, df, columns, params)
    
    X_umap = do_umap(X2)

    umap_df = pd.DataFrame(data=X_umap, columns=['x', 'y'])
    umap_df['cluster'] = y2
    json_data = {}
    json_data['cluster'] = umap_df.to_dict(orient='records')
    json_data['bestK'] = bestK
    return jsonify(json_data)


if __name__ == '__main__':
    app.run(debug=True)

