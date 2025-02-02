import React, { useState, useEffect } from 'react';
import AppRoutes from './AppRoutes';
import { AppContext } from "./lib/contextLib";

import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import { onError } from './lib/errorLib';
import Cookies from 'universal-cookie';

import NavTopBar from "./components/Navbar/NavTopBar";
import LeftPanelDrawer from "./components/LeftPanelDrawer";

// Design Components
import { message } from 'antd';

// Google Analytics.
import ReactGA from 'react-ga';

// Styling
import './App.css';
import { checkAuth } from './utils/ClassUtils';

function App() {
  let navigate = useNavigate();

  const [isAuthenticated, userHasAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  if (process.env.REACT_APP_GA_CODE) {
    ReactGA.initialize(process.env.REACT_APP_GA_CODE);
  }

  useEffect(() => {
    ReactGA.pageview(window.location.pathname + window.location.search);
    onLoad();
  }, []);

  async function onLoad() {
    console.log("onload--", Auth.currentSession())
    try {
      console.log("SESSION", await Auth.currentSession());
      console.log("AFTEr session")
      userHasAuthenticated(true);
    } catch(e) {
      console.log("ERROR ", e)
      if (e !== 'No current user') {
        onError(e);
      }
    }
    setIsAuthenticating(false);
  }

  async function handleLogout() {
    await Auth.signOut();
    userHasAuthenticated(false);
    // close the drawer after logout
    setOpenDrawer(false);
    const cookies = new Cookies();
    cookies.remove('isLoggedIn', { path: '/' });
    cookies.remove('jwtToken', { path: '/' });
    navigate("/");
    console.log("logout--", cookies.getAll())
  }
 
  function deleteAllData(query, requestHeaders) {  
    fetch(query, requestHeaders)
    .then(res => res.json())
    .then(data => {
      console.log('Response', data);
      if (data.message === 'Success') {
        const successMessage = "Your data and credentials have been succesfully deleted.";
        showMessage(successMessage);
      } else {
        const errorMessage = "Something went wrong. Please try again, later.";
        showMessage(null, errorMessage);
      }
    })
    .catch(console.log)
  }

  function triggerIndexBuild(query, requestOptions) {
    fetch(query, requestOptions)
    .then(res => res.json())
    .then(data => {
      console.log('Response', data);
      if (data.message === 'Success') {
        const successMessage = "Index build triggered successfully.";
        showMessage(successMessage);
      } else {
        const errorMessage = "Something went wrong. Please try again, later.";
        showMessage(null, errorMessage);
      }
    })
    .catch(console.log)
  }

  async function handleDeleteAllDataCognitoUser() {
    const query = process.env.REACT_APP_API_URL + '/deleteAllData';
    const res = await Auth.currentSession();
    const accessToken = res.getAccessToken();
    const jwtToken = accessToken.getJwtToken();
    const requestHeaders = {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + jwtToken }
    };
    deleteAllData(query, requestHeaders);
  }

  async function handleDeleteAllDataGoogleSSO() {  
    const requestHeaders = { 'method': 'POST' };  
    const query = process.env.REACT_APP_API_URL + '/google/deleteAllData';
    deleteAllData(query, requestHeaders);
  }

  async function handleDeleteAllData() {  
    const cookies = new Cookies();
    const loginType = cookies.get('loginType', { path: '/' });
    if (loginType === 'cognito') {
      handleDeleteAllDataCognitoUser();
    } else {
      handleDeleteAllDataGoogleSSO();
    }
  }

  async function handleTriggerIndexBuildCognitoUser() {
    const query = process.env.REACT_APP_API_URL + '/buildIndex';
    const res = await Auth.currentSession();
    const accessToken = res.getAccessToken();
    const jwtToken = accessToken.getJwtToken();
    const requestOptions = {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwtToken 
      },
      body: JSON.stringify({
        'userId': accessToken.payload.sub,
        'userName': accessToken.payload.username,
        'userEmail': accessToken.payload.username,
        'dataSource': 'ALL'
      })
    };
    triggerIndexBuild(query, requestOptions);
  }

  async function handleTriggerIndexBuildGoogleSSO() {}

  async function handleTriggerIndexBuild() {
    const cookies = new Cookies();
    const loginType = cookies.get('loginType', { path: '/' });
    if (loginType === 'cognito') {
      handleTriggerIndexBuildCognitoUser();
    } else {
      handleTriggerIndexBuildGoogleSSO();
    }
  }

  function showMessage(success, error, warning) {
    if (success !== null) {
        message.success({
          content: success,
          className: 'display-message',
        });
    } else if (error !== null) {
        message.error({
          content: error,
          className: 'display-message',
        });
    } else if (warning !== null) {
      message.warning({
        content: warning,
        className: 'display-message',
      });
    }
  }

  function handleClick() {
    setFilteredSuggestions([]);
    setActiveSuggestion(-1);
    var elementExists = document.getElementById('searchInputContainer');
    if (elementExists) {
      document.getElementById('searchInputContainer').style.borderRadius = '0px';
      document.getElementById('searchSuggestionContainerId').style.display = 'none';
    }
  }

  // Handle LeftPanelDrawer properties
  const leftPanelDefaultWidth = 220; // px
  // closed if not authenticated
  const [openDrawer, setOpenDrawer] = useState(true)
  const handleDrawerOpen = () => { setOpenDrawer(true) }
  const handleDrawerClose = () => { console.log("closing the drawer"); setOpenDrawer(false) }

  useEffect(() => {
    setOpenDrawer(checkAuth() && true)
  }, []);

  // width - to resize app-content accordingly
  const [leftPanelWidth, setLeftPanelWidth] = useState(leftPanelDefaultWidth);

  return (
    // Outer most component
    <div className="App" onClick={handleClick}>
        {/* The top navigation bar component */}
        <AppContext.Provider value={{
          isAuthenticated, userHasAuthenticated,
          filteredSuggestions, setFilteredSuggestions,
          activeSuggestion, setActiveSuggestion
        }}>
        <NavTopBar
          isAuthenticating={isAuthenticating}
          handleLogout={handleLogout}
          handleDeleteAllData={handleDeleteAllData}
          handleTriggerIndexBuild={handleTriggerIndexBuild}
          // Drawer functionality
          open={openDrawer}
          handleDrawerClose={handleDrawerClose}
          handleDrawerOpen={handleDrawerOpen}
        />
        
          {/* The LeftPanel component - used for navigation */}
          {/* TODO (satyam.sundaram): useContext instead of passing props */}
          <LeftPanelDrawer
            leftPanelWidth={leftPanelWidth}
            open={openDrawer}
            handleDrawerClose={handleDrawerClose}
            handleDrawerOpen={handleDrawerOpen}
          />
          {/* This is the actual app content */}
          <AppRoutes
            isAuthenticated={isAuthenticated}
            isLeftPanelOpen={openDrawer}
            leftPanelWidth={leftPanelWidth}
          />
        </AppContext.Provider>
    </div>
  );
}

export default App;
