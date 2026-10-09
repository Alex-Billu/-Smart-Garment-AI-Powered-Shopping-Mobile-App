import numpy as np

class DecisionNode:
    def __init__(self, feature=None, threshold=None, left=None, right=None, *, value=None):
        self.feature = feature          # Index of feature to split on
        self.threshold = threshold      # Threshold value for split
        self.left = left                # Left subtree (node)
        self.right = right              # Right subtree (node)
        self.value = value              # Value if node is a leaf (class probabilities or direct class)

    def is_leaf(self):
        return self.value is not None

class PureDecisionTree:
    def __init__(self, min_samples_split=2, max_depth=10, n_features=None):
        self.min_samples_split = min_samples_split
        self.max_depth = max_depth
        self.n_features = n_features
        self.root = None

    def fit(self, X, y):
        self.n_features = X.shape[1] if not self.n_features else min(X.shape[1], self.n_features)
        self.root = self._grow_tree(X, y)

    def _grow_tree(self, X, y, depth=0):
        n_samples, n_feats = X.shape
        n_labels = len(np.unique(y))

        # Check stopping criteria
        if (depth >= self.max_depth or 
            n_labels == 1 or 
            n_samples < self.min_samples_split):
            leaf_value = self._most_common_label(y)
            return DecisionNode(value=leaf_value)

        # Randomly select features for the split (used in Random Forest)
        feat_idxs = np.random.choice(n_feats, self.n_features, replace=False)

        # Find the best split
        best_feat, best_thresh = self._best_split(X, y, feat_idxs)

        if best_feat is None:
            leaf_value = self._most_common_label(y)
            return DecisionNode(value=leaf_value)

        # Grow subtrees
        left_idxs, right_idxs = self._split(X[:, best_feat], best_thresh)
        left = self._grow_tree(X[left_idxs, :], y[left_idxs], depth + 1)
        right = self._grow_tree(X[right_idxs, :], y[right_idxs], depth + 1)
        return DecisionNode(feature=best_feat, threshold=best_thresh, left=left, right=right)

    def _best_split(self, X, y, feat_idxs):
        best_gain = -1
        split_idx, split_thresh = None, None

        for feat_idx in feat_idxs:
            X_column = X[:, feat_idx]
            thresholds = np.unique(X_column)
            for threshold in thresholds:
                # Calculate information gain / gini impurity reduction
                gain = self._gini_gain(y, X_column, threshold)
                if gain > best_gain:
                    best_gain = gain
                    split_idx = feat_idx
                    split_thresh = threshold

        return split_idx, split_thresh

    def _gini_gain(self, y, X_column, threshold):
        # Parent Gini
        parent_gini = self._gini_impurity(y)

        # Generate splits
        left_idxs, right_idxs = self._split(X_column, threshold)
        if len(left_idxs) == 0 or len(right_idxs) == 0:
            return 0

        # Weighted Gini of children
        n = len(y)
        n_l, n_r = len(left_idxs), len(right_idxs)
        gini_l, gini_r = self._gini_impurity(y[left_idxs]), self._gini_impurity(y[right_idxs])
        child_gini = (n_l / n) * gini_l + (n_r / n) * gini_r

        # Gini Gain
        return parent_gini - child_gini

    def _gini_impurity(self, y):
        _, counts = np.unique(y, return_counts=True)
        probabilities = counts / len(y)
        return 1.0 - np.sum(probabilities ** 2)

    def _split(self, X_column, split_thresh):
        left_idxs = np.argwhere(X_column <= split_thresh).flatten()
        right_idxs = np.argwhere(X_column > split_thresh).flatten()
        return left_idxs, right_idxs

    def _most_common_label(self, y):
        # Return class probabilities (dict) or simple majority label
        labels, counts = np.unique(y, return_counts=True)
        probs = dict(zip(labels, counts / len(y)))
        return probs

    def predict_node(self, node, x):
        if node.is_leaf():
            return node.value

        if x[node.feature] <= node.threshold:
            return self.predict_node(node.left, x)
        return self.predict_node(node.right, x)

    def predict(self, X):
        return [self.predict_node(self.root, x) for x in X]


class PureRandomForest:
    def __init__(self, n_trees=10, max_depth=10, min_samples_split=2, n_features=None):
        self.n_trees = n_trees
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.n_features = n_features
        self.trees = []

    def fit(self, X, y):
        self.trees = []
        for _ in range(self.n_trees):
            tree = PureDecisionTree(
                min_samples_split=self.min_samples_split,
                max_depth=self.max_depth,
                n_features=self.n_features
            )
            # Bootstrap sample
            n_samples = X.shape[0]
            idxs = np.random.choice(n_samples, n_samples, replace=True)
            X_sample, y_sample = X[idxs], y[idxs]
            tree.fit(X_sample, y_sample)
            self.trees.append(tree)

    def predict(self, X):
        # Check input type and convert if list
        if isinstance(X, list):
            X = np.array(X)
        if len(X.shape) == 1:
            X = X.reshape(1, -1)

        predictions = []
        for x in X:
            # Aggregate probabilities across all trees
            aggregated_probs = {}
            for tree in self.trees:
                probs = tree.predict_node(tree.root, x)
                for label, prob in probs.items():
                    aggregated_probs[label] = aggregated_probs.get(label, 0) + (prob / self.n_trees)
            
            # Select class with highest aggregated probability
            best_label = max(aggregated_probs, key=aggregated_probs.get)
            predictions.append(best_label)
            
        return predictions

    def predict_proba(self, X):
        if isinstance(X, list):
            X = np.array(X)
        if len(X.shape) == 1:
            X = X.reshape(1, -1)

        proba_list = []
        for x in X:
            aggregated_probs = {}
            for tree in self.trees:
                probs = tree.predict_node(tree.root, x)
                for label, prob in probs.items():
                    aggregated_probs[label] = aggregated_probs.get(label, 0) + (prob / self.n_trees)
            proba_list.append(aggregated_probs)
        return proba_list
