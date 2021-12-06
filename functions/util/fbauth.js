const { admin, db } = require('./admin');

module.exports = (request, response, next) => {
  let token;
  if (
    request.headers.authorization &&
    request.headers.authorization.startsWith('Bearer ')
  ) {
    token = request.headers.authorization.split('Bearer ')[1];
  } else {
    response.json({ message: 'Unauthorized' });
  }

  admin
    .auth()
    .verifyIdToken(token)
    .then((decodedToken) => {
      request.user = decodedToken;
      return db
        .collection('users')
        .where('userId', '==', request.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      request.user.username = data.docs[0].data().username;
      request.user.imageUrl = data.docs[0].data().imageUrl;
      return next();
    })
    .catch((error) => {
      console.error(error);
    });
};
