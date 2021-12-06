const isEmpty = (string) => {
  return string.trim() === '';
};

exports.reduceUserDetails = (data) => {
  let userDetails = {};

  if (!isEmpty(data.bio)) {
    userDetails.bio = data.bio;
  }
  if (!isEmpty(data.website)) {
    if (data.website.trim().substring(0, 4) !== 'http') {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website.trim();
  }
  if (!isEmpty(data.location)) userDetails.location = data.location;

  return userDetails;
};
