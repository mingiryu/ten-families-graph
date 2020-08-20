

import pandas as pd
import simplejson


# Read csv files
attr = pd.read_csv('TenFamiliesAttributes.csv')
struct = pd.read_csv('TenFamiliesStructure.csv')

# Indicate attributes
attr['from_attributes'] = True
struct = struct.drop_duplicates('personid')

# Merge attributes and structure
tree = struct.merge(attr, on='personid', how='left')
tree['from_attributes'] = tree['from_attributes'].fillna(False)

# Clean & touch up
tree = tree.reset_index(drop=True)
tree = tree.drop(columns=['RelativeID'])
tree['id'] = tree['personid']

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
