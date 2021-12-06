const functions = require('firebase-functions');
const app = require('express')();
const {
  getAllPosts,
  postOnePost,
  getPost,
  postComment,
  likePost,
  unlikePost,
} = require('./handlers/post');
const {
  signUp,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationRead,
} = require('./handlers/user');
const { db } = require('./util/admin');
const fbauth = require('./util/fbauth');
//post
app.get('/post', getAllPosts);
app.post('/post', fbauth, postOnePost);
app.get('/post/:postId', getPost);
app.post('/post/:postId/comment', fbauth, postComment);
//like,unlike
app.get('/post/:postId/like', fbauth, likePost);
app.get('/post/:postId/unlike', fbauth, unlikePost);

//user
app.post('/signup', signUp);
app.post('/login', login);
app.post('/user/image', fbauth, uploadImage);
app.post('/user', fbauth, addUserDetails);
app.get('/user', fbauth, getAuthenticatedUser);
app.get('/user/:username', getUserDetails);
app.post('/notification', fbauth, markNotificationRead);

exports.api = functions.region('asia-east2').https.onRequest(app);

exports.createNotificationOnLike = functions
  .region('asia-east2')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().username !== snapshot.data().username) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().username,
            read: false,
            sender: snapshot.data().username,
            type: 'like',
            postId: doc.id,
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });

exports.deleteNotificationOnUnlike = functions
  .region('asia-east2')
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((error) => {
        console.error(error);
      });
  });

exports.createNotificationOnComment = functions
  .region('asia-east2')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().username !== snapshot.data().username) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().username,
            read: false,
            sender: snapshot.data().username,
            type: 'comment',
            postId: doc.id,
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });

exports.onUserImageChangePosts = functions
  .region('asia-east2')
  .firestore.document('users/{userId}')
  .onUpdate((change) => {
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      const batch = db.batch();
      return db
        .collection('posts')
        .where('username', '==', change.before.data().username)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/posts/${doc.id}`);
            batch.update(post, { userImage: change.after.data().imageUrl });
            return batch.commit();
          });
        });
    } else return true;
  });

exports.onUserImageChangeComments = functions
  .region('asia-east2')
  .firestore.document('users/{userId}')
  .onUpdate((change) => {
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      const batch = db.batch();
      return db
        .collection('comments')
        .where('username', '==', change.before.data().username)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const comment = db.doc(`/comments/${doc.id}`);
            batch.update(comment, { userImage: change.after.data().imageUrl });
            return batch.commit();
          });
        });
    } else return true;
  });
