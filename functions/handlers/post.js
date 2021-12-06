const { db } = require('../util/admin');

exports.getAllPosts = (request, response) => {
  db.collection('posts')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let posts = [];
      data.forEach((doc) => {
        posts.push({
          postId: doc.id,
          ...doc.data(),
        });
      });
      response.json(posts);
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.postOnePost = (request, response) => {
  const newPost = {
    content: request.body.content,
    username: request.user.username,
    userImage: request.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  };
  db.collection('posts')
    .add(newPost)
    .then((doc) => {
      newPost.postId = doc.id;
      response.json(newPost);
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.getPost = (request, response) => {
  let postData = {};
  db.doc(`/posts/${request.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return response.json({ message: "post doesn't exist" });
      } else {
        postData = doc.data();
        postData.postId = doc.id;
        return db
          .collection('comments')
          .orderBy('createdAt', 'desc')
          .where('postId', '==', request.params.postId)
          .get();
      }
    })
    .then((data) => {
      postData.comments = [];
      data.forEach((doc) => {
        postData.comments.push(doc.data());
      });
      response.json(postData);
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.postComment = (request, response) => {
  if (request.body.content.trim() === '') {
    return response.json({ message: "comment can't be empty" });
  }

  const newComment = {
    content: request.body.content,
    createdAt: new Date().toISOString(),
    username: request.user.username,
    postId: request.params.postId,
    userImage: request.user.imageUrl,
  };

  const postDoc = db.doc(`/posts/${request.params.postId}`);
  postDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return response.json({ message: "post doesn't exist" });
      }
      let newCommentCount = doc.data().commentCount + 1;
      postDoc.update({ commentCount: newCommentCount });
      return db.collection('comments').add(newComment);
    })
    .then(() => {
      response.json(newComment);
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.likePost = (request, response) => {
  // tao document moi trong collection likes
  // likecount++ trong post duoc like
  let postData;
  db.collection('likes').add({
    postId: request.params.postId,
    username: request.user.username,
  });
  const postDoc = db.doc(`/posts/${request.params.postId}`);
  postDoc
    .get()
    .then((doc) => {
      if (doc.exists) {
        let newLikeCount = doc.data().likeCount + 1;
        postData = doc.data();
        postData.postId = doc.id;
        return postDoc.update({ likeCount: newLikeCount });
      } else {
        response.json({ message: "post doesn't exist" });
      }
    })
    .then(() => {
      postData.likeCount++;
      response.json(postData);
    })
    .catch((error) => {
      console.log(error);
    });
};

exports.unlikePost = (request, response) => {
  const likeDocument = db
    .collection('likes')
    .where('postId', '==', request.params.postId)
    .where('username', '==', request.user.username)
    .limit(1)
    .get()
    .then((doc) => {
      db.doc(`/likes/${doc.docs[0].id}`).delete();
    })
    .catch((error) => {
      console.error(error);
    });

  let postData;

  const postDoc = db.doc(`/posts/${request.params.postId}`);
  postDoc
    .get()
    .then((doc) => {
      if (doc.exists) {
        let newLikeCount = doc.data().likeCount - 1;
        postData = doc.data();
        postData.postId = doc.id;
        return postDoc.update({ likeCount: newLikeCount });
      } else {
        response.json({ message: "post doesn't exist" });
      }
    })
    .then(() => {
      postData.likeCount--;
      response.json(postData);
    })
    .catch((error) => {
      console.log(error);
    });
};
