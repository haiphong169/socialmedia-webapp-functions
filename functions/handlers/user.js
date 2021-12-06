const { admin, db } = require('../util/admin');
const firebaseConfig = require('../util/config');
const { initializeApp } = require('firebase/app');
initializeApp(firebaseConfig);
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require('firebase/auth');
const { reduceUserDetails } = require('../util/validator');

const auth = getAuth();

exports.signUp = (request, response) => {
  // create credentials from request
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    username: request.body.username,
  };

  const noImg = 'no-img.png';

  let userId;
  db.doc(`/users/${newUser.username}`)
    .get()
    .then((data) => {
      // check if username is already taken
      if (data.exists) {
        response
          .status(400)
          .json({ message: 'this username is already taken' });
      } else {
        // sign up the user, return the userCredentials
        return createUserWithEmailAndPassword(
          auth,
          newUser.email,
          newUser.password
        );
      }
    })
    .then((data) => {
      // get idToken
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((token) => {
      // register data to db
      const newUserCredentials = {
        username: newUser.username,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
        userId,
      };
      db.doc(`/users/${newUser.username}`).set(newUserCredentials);
      response.json({ token });
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.login = (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password,
  };

  signInWithEmailAndPassword(auth, user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      response.json({ token });
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.uploadImage = (request, response) => {
  const Busboy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new Busboy({ headers: request.headers });

  let imageFilename;
  let imageToBeUploaded = {};

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return response.json({ message: 'wrong file type submitted' });
    }
    const imageExtension = filename.split('.')[filename.split('.').length - 1];
    imageFilename = `${Math.round(Math.random() * 1000000)}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFilename);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFilename}?alt=media`;
        db.doc(`/users/${request.user.username}`).update({ imageUrl });
      })
      .then(() => {
        response.json({ message: 'image uploaded' });
      })
      .catch((error) => {
        console.error(error);
      });
  });
  busboy.end(request.rawBody);
};

exports.addUserDetails = (request, response) => {
  let userDetails = reduceUserDetails(request.body);

  db.doc(`/users/${request.user.username}`)
    .update(userDetails)
    .then(() => {
      response.json({ message: 'details added' });
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.getAuthenticatedUser = (request, response) => {
  let userData = {};
  db.doc(`/users/${request.user.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection('likes')
          .where('username', '==', request.user.username)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return db
        .collection('notifications')
        .where('recipient', '==', request.user.username)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          notificationId: doc.id,
          ...doc.data(),
        });
      });
      response.json(userData);
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.getUserDetails = (request, response) => {
  let userData = {};
  db.doc(`/users/${request.params.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection('posts')
          .where('username', '==', request.params.username)
          .orderBy('createdAt', 'desc')
          .get();
      } else {
        response.json({ message: 'user not found' });
      }
    })
    .then((data) => {
      userData.posts = [];
      data.forEach((doc) => {
        userData.posts.push({
          postId: doc.id,
          ...doc.data(),
        });
      });
      return response.json(userData);
    })
    .catch((error) => {
      console.error(error);
    });
};

exports.markNotificationRead = (request, response) => {
  let batch = db.batch();
  request.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      response.json({ message: 'notifications marked read' });
    })
    .catch((error) => {
      console.error(error);
    });
};
