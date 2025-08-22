useEffect(() => {
  if (isPopupOpen) {
    document.body.classList.add('popup-open');
  } else {
    document.body.classList.remove('popup-open');
  }

  return () => {
    document.body.classList.remove('popup-open');
  };
}, [isPopupOpen]); 