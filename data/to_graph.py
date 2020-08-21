

import pandas as pd
import simplejson


droplist = [
 'FirstBMI',
 'MaxBMI',
 'STATENUM', # Utah only
 'race', # White only
 'zip', # Utah only
 'AgeFirstBMI',
 'AgeMaxBMI',
 'Age1D_alcohol',
 'Nr.Diag_alcohol',
 'Age1D_psychosis',
 'Nr.Diag_psychosis',
 'Age1D_anxiety-non-trauma',
 'Nr.Diag_anxiety-non-trauma',
 'Age1D_somatic disorder',
 'Nr.Diag_somatic disorder',
 'Age1D_eating',
 'Nr.Diag_eating',
 'Age1D_bipolar spectrum illness',
 'Nr.Diag_bipolar spectrum illness',
 'Age1D_depression',
 'Nr.Diag_depression',
 'Age1D_interpersonal trauma',
 'Nr.Diag_interpersonal trauma',
 'Age1D_PD-Cluster C-anxiety',
 'Nr.Diag_PD-Cluster C-anxiety',
 'Age1D_PD-Cluster B-emotional',
 'Nr.Diag_PD-Cluster B-emotional',
 'Age1D_PD',
 'Nr.Diag_PD',
 'Age1D_Impulse control disorder',
 'Nr.Diag_Impulse control disorder',
 'Age1D_obesity',
 'Nr.Diag_obesity',
 'Age1D_cardiovascular',
 'Nr.Diag_cardiovascular',
 'Age1D_COPD',
 'Nr.Diag_COPD',
 'Age1D_asthma',
 'Nr.Diag_asthma',
 'Age1D_immune-autoimmune',
 'Nr.Diag_immune-autoimmune',
]

# Read csv files
attr = pd.read_csv('TenFamiliesAttributes.csv')
struct = pd.read_csv('TenFamiliesStructure.csv')

struct = struct.drop_duplicates('personid')

# Merge attributes and structure
tree = struct.merge(attr, on='personid', how='left')

# Clean & touch up
tree = tree.reset_index(drop=True)
tree = tree.drop(columns=['RelativeID'])
tree['id'] = tree['personid']
tree = tree.drop(columns=droplist)

# Extract nodes from dataframe
nodes = tree.to_dict('records')

# Create a set of IDs
personids = set([node['personid'] for node in nodes])

# Generate links
links = []

for node in nodes:
    personid = node['personid']
    paid = node['PaID']
    maid = node['MaID']

    if paid and paid in personids:
        links.append(dict(source=paid, target=personid, value=1))

    if maid and maid in personids:
        links.append(dict(source=maid, target=personid, value=1))

# Save as json
data = dict(nodes=nodes, links=links)

with open('TenFamiliesGraph.json', 'w') as fp:
    simplejson.dump(data, fp, ignore_nan=True)
