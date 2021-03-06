// Wrapping code in an immediately-invoked function expression to avoid global variables
(function() {

    const restaurantQueryResults = [];
    const currentCategories = [];
    let totalRestaurantsFound = 0;
    let currentOffset = 0;
    let queryCounter = 0;
    let currentRadius = 0;
    let currentDistance = 0;
    let splicedQueryResults = false;

    function handleRestaurantForm() {
        $('.js-restaurant-form').submit(event => {
            event.preventDefault();
            restaurantQueryResults.splice(0, restaurantQueryResults.length);
            currentCategories.splice(0, currentCategories.length);
            currentOffset = 0;
            queryCounter = 0;
            splicedQueryResults = false;
            $('.js-restaurant').empty();
            $('.js-directions-container').remove();
            $('.js-utensils').toggleClass('hidden');
            if (!$('.js-restaurant').hasClass('hidden')) {
                $('.js-restaurant').toggleClass('hidden');
            }

            $(document).ready(() => {
                $('html, body').animate({
                    scrollTop: $('.js-utensils').offset().top - 50
                }, 'slow');
            });
            fetchRestaurants();
        });
    }

    // Makes return to search button disappear on scroll then reappear after scrolling stops
    function toggleToTop() {
        $(window).scroll(function() {
            if (!$('.js-to-top').hasClass('hidden')) {
                $('.js-to-top').fadeOut('slow');
                clearTimeout($.data(this, 'scrollTimer'));
                $.data(this, 'scrollTimer', setTimeout(function() {
                    $('.js-to-top').fadeIn('slow');
                }, 500));
            }
        });
    }

    function returnToSearch() {
        $('.js-to-top').click(() => {
            $('html, body').animate({
                scrollTop: $('.js-restaurant-form').offset().top - 50
            }, 'slow');
        });
    }

    // Fetches from Foursquare API list of restaurants that meet query parameters
    function fetchRestaurants() {
        const baseURL = 'https://api.foursquare.com/v2/venues/explore?';
        const params = getSearchQueryParams();
        fetch(`${baseURL}${params}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 400) {
                    toggleUtensilsAndRestaurant();
                    $('.js-restaurant').html(`
                        <h2>Error:</h2>
                        <p>The location "${$('.js-location').val()}" could not be found.  
                        Check for typos or alter the format of your query.</p>
                        <p><b>For example:</b> enter a zipcode (10010) or enter a state following a city (New York, NY).</p>
                    `);
                    $(document).ready(() => {
                        $('html, body').animate({
                            scrollTop: $('.js-restaurant').offset().top - 50
                        }, 'slow');
                    });
                    throw new Error(response.statusText);
                } else {
                    toggleUtensilsAndRestaurant();
                    handleRestaurantAPIError();
                    throw new Error(response.statusText);
                }
            })
            .then(responseJson => loadRestaurants(responseJson))
            .catch(error => {
                console.log('error', error);
                if ($('.js-restaurant').hasClass('hidden')) {
                    toggleUtensilsAndRestaurant();
                    handleRestaurantAPIError();
                }
            });
    }

    function toggleUtensilsAndRestaurant() {
        if (!$('.js-utensils').hasClass('hidden')) {
            $('.js-utensils').toggleClass('hidden');
        }

        if ($('.js-restaurant').hasClass('hidden')) {
            $('.js-restaurant').toggleClass('hidden');
        }
    }

    function handleRestaurantAPIError() {
        $('.js-restaurant').html(`
            <h2>Error:</h2>
            <p>Looks like something went wrong while looking for a restaurant.
            Please wait a few seconds and try again.</p>
        `);
        $(document).ready(() => {
            $('html, body').animate({
                scrollTop: $('.js-restaurant').offset().top - 50
            }, 'slow');
        });
    }

    function getSearchQueryParams() {
        const client_id = '4MRDI4UFA2MFILISD0LH1WB2WZWQVP42WUECJQQ44HFPZUPV';
        const client_secret = 'C2DTDQYT5VWKD3OXJTBOVHHGWOPIREMU41UQND25GEJFP2ME';
        const near = setLocation();
        const limit = 50;
        const categoryId = setCategories();
        const v = '20200408';
        const radius = setRadius();
        const price = setPrice();
        const offset = currentOffset;
        const queryParamsObject = {
            client_id,
            client_secret,
            near,
            limit,
            categoryId,
            v,
            radius,
            price,
            offset
        };
        const queryParamsArray = [];
        Object.keys(queryParamsObject).forEach(key => {
            queryParamsArray.push(`${key}=${queryParamsObject[key]}`);
        });
        return queryParamsArray.join('&');
    }

    function setPrice() {
        const price = [];
        for (let i = 1; i <= 4; i++) {
            if ($(`#${i}`).prop('checked')) {
                price.push(i);
            }
        }

        if (price.length === 0) {
            return '1,2,3,4';
        }

        return price.join(',');
    }

    function setLocation() {
        return $('.js-location').val();
    }

    function setCategories() {
        const clickedCategories = [];
        const categories = [
            'African',
            'American',
            'Asian',
            'BBQ',
            'Bagels',
            'Bakery',
            'Bistro',
            'Breakfast',
            'Buffet',
            'Burgers',
            'Cafe',
            'Coffee-Shop',
            'Comfort-Food',
            'Deli-Bodega',
            'Diner',
            'Donuts',
            'Fast-Food',
            'French',
            'Gluten-free',
            'Halal',
            'Indian',
            'Irish',
            'Italian',
            'Latin-American',
            'Mexican',
            'Middle-Eastern',
            'Pizza',
            'Restaurant',
            'Salad',
            'Sandwiches',
            'Seafood',
            'Steakhouse',
            'Vegetarian-Vegan',
            'Wings'
        ];
        for (let category of categories) {
            if ($(`#${category}`).prop('checked')) {
                clickedCategories.push($(`#${category}`).val());
            }
        }

        // Adds generic "restaurant" category to search parameters if no category is clicked by the user
        if (clickedCategories.length === 0) {
            currentCategories.push('4bf58dd8d48988d1c4941735');
            return '4bf58dd8d48988d1c4941735';
        } else {
            currentCategories.push(...clickedCategories);
            return clickedCategories.join(',');
        }
    }

    function setRadius() {
        const distance = $('.js-radius').val();
        currentRadius = parseInt(distance);
        return distance * 1609;
    }

    // Stores restaurants returned by Foursquare API and updates search offset, since API only returns 50 restaurants at a time
    function loadRestaurants(data) {
        totalRestaurantsFound = data.response.totalResults;
        const responseGroupsArray = data.response.groups;
        for (let responseGroup of responseGroupsArray) {
            if (totalRestaurantsFound === 0) {
                toggleUtensilsAndRestaurant();
                $('.js-restaurant').html(`
                    <p>Sorry, no restaurant found that matches those parameters.  Try again with different parameters.</p>
                `);
            } else if (queryCounter === 10 && restaurantQueryResults.length === 0) {
                toggleUtensilsAndRestaurant();
                $('.js-restaurant').html('<p>Sorry, looks like something went wrong.  Try again with different parameters.</p>');
            } else if (queryCounter === 10 && restaurantQueryResults.length !== 0) {
                pickRestaurant();
            } else {
                currentOffset += responseGroup.items.length;
                restaurantQueryResults.push(...responseGroup.items);
                if (restaurantQueryResults.length < totalRestaurantsFound) {
                    queryCounter += 1;
                    fetchRestaurants();
                } else {
                    pickRestaurant();
                }
            }
        }
    }

    // Chooses a random restaurant from the array of restaurants returned by API
    function pickRestaurant() {
        if (restaurantQueryResults.length === 0 && splicedQueryResults) {
            toggleUtensilsAndRestaurant();
            $('.js-restaurant').html(`
                <p>Sorry, no restaurant found that matches those parameters.  Try again with different parameters.</p>
            `);
        } else {
            const randomNum = Math.floor(Math.random() * restaurantQueryResults.length);
            const randomRestaurant = restaurantQueryResults[randomNum];

            /**
            * Filters out restaurants returned by the API that do not belong in the requested catgory 
            * and are located outside of the requested search radius
            */
            if (checkCategories(randomRestaurant.venue.categories)) {
                fetchDistance(`${randomRestaurant.venue.location.lat},${randomRestaurant.venue.location.lng}`, randomNum);
            } else {
                restaurantQueryResults.splice(randomNum, 1);
                splicedQueryResults = true;
                pickRestaurant();
            }
        }
    }

    function checkCategories(categoriesArray) {
        // The id '4bf58dd8d48988d1c4941735' indicates a generic search, meaning a category check is unnecessary
        if (currentCategories.find(id => id === '4bf58dd8d48988d1c4941735')) {
            return true;
        } else {
            for (let queriedCategory of categoriesArray) {
                if (currentCategories.includes(queriedCategory.id)) {
                    return true;
                }
            }

            return false;
        }
    }

    // Requests directions from MapQuest API so that location within search radius can be checked
    function fetchDistance(latLong, randomNum) {
        const baseURL = 'https://www.mapquestapi.com/directions/v2/route?';
        const params = getDirectionsParams(latLong);
        fetch(`${baseURL}${params}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    toggleUtensilsAndRestaurant();
                    handleRestaurantAPIError();
                    throw new Error(response.statusText);
                }
            })
            .then(responseJson => setAndCheckCurrentDistance(responseJson, randomNum))
            .catch(error => {
                console.log("error", error);
                if ($('.js-restaurant').hasClass('hidden')) {
                    toggleUtensilsAndRestaurant();
                    handleRestaurantAPIError();
                }
            });
    }

    function getDirectionsParams(latLong) {
        const key = 'Nm7BvCgkqE4CwDRloh8s14FNG4NPdjSp';
        const from = getDeparturePoint();
        const to = latLong;
        const routeType = getRouteType();
        const narrativeType = 'html';
        const paramsObject = {
            key,
            from,
            to,
            routeType,
            narrativeType
        };
        const paramsArray = [];
        Object.keys(paramsObject).forEach(key => {
            paramsArray.push(`${key}=${paramsObject[key]}`);
        });
        return paramsArray.join('&');
    }

    function setAndCheckCurrentDistance(data, randomNum) {
        currentDistance = data.route.distance;
        if (currentDistance > currentRadius) {
            restaurantQueryResults.splice(randomNum, 1);
            splicedQueryResults = true;
            pickRestaurant();
        } else {
            fetchRestaurantDetails(restaurantQueryResults[randomNum].venue.id);
        }
    }

    // Fetches detailed information on random restaurant from Foursquare API
    function fetchRestaurantDetails(id) {
        const baseURL = 'https://api.foursquare.com/v2/venues/';
        const clientID = 'client_id=4MRDI4UFA2MFILISD0LH1WB2WZWQVP42WUECJQQ44HFPZUPV';
        const clientSecret = 'client_secret=C2DTDQYT5VWKD3OXJTBOVHHGWOPIREMU41UQND25GEJFP2ME';
        const v = 'v=20200408';
        fetch(`${baseURL}${id}?${clientID}&${clientSecret}&${v}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    toggleUtensilsAndRestaurant();
                    handleRestaurantAPIError();
                    throw new Error(response.statusText);
                }
            })
            .then(responseJson => displayRandomRestaurant(responseJson))
            .catch(error => {
                console.log('error', error);
                if ($('.js-restaurant').hasClass('hidden')) {
                    toggleUtensilsAndRestaurant();
                    handleRestaurantAPIError();
                }
            });
    }

    function displayRandomRestaurant(data) {
        toggleUtensilsAndRestaurant();
        $('.js-to-top').removeClass('hidden');
        const restaurantInfo = data.response.venue;
        const restaurantInfoKeys = Object.keys(restaurantInfo);
        const name = restaurantInfo.name;
        const phoneNumber = getPhoneNumber(restaurantInfo, restaurantInfoKeys);
        const addressHTML = getRestaurantAddressHTML(restaurantInfo, restaurantInfoKeys);
        const latLong = getLatLong(restaurantInfo, restaurantInfoKeys);
        const urlHTML = getURLHTML(restaurantInfo, restaurantInfoKeys);
        const categoriesHTML = getCategoriesHTML(restaurantInfo, restaurantInfoKeys);
        const priceHTML = getPriceHTML(restaurantInfo, restaurantInfoKeys);
        const menuHTML = getMenuHTML(restaurantInfo, restaurantInfoKeys);
        const ratingHTML = getRestaurantRatingHTML(restaurantInfo, restaurantInfoKeys);
        const hoursHTML = getHoursHTML(restaurantInfo, restaurantInfoKeys);
        const attributesHTML = getAttributesHTML(restaurantInfo, restaurantInfoKeys);
        const bestPhotoHTML = getBestPhotoHTML(restaurantInfo, restaurantInfoKeys);
        const foodPhotoHTML = getFoodPhotoHTML(restaurantInfo, restaurantInfoKeys);
        $('.js-restaurant').html(`
            <h2>${name}</h2>
            ${bestPhotoHTML}<br>
            ${urlHTML}
            <p><b>Phone:</b> ${phoneNumber}</p>
            <h3>Address:</h3>
            ${addressHTML}
            <div id="map" class="map js-map" role="img" aria-label="An interactive map that shows the location of the queried restaurant.">
            </div>
            <h3>Categories:</h3>
                <ul>
                    ${categoriesHTML}
                </ul>
            ${foodPhotoHTML}
            <h3>Price, Menu, and Rating Info:</h3>
            ${priceHTML}
            ${menuHTML}
            ${ratingHTML}
            <h3>Hours:</h3>
                <ul>
                    ${hoursHTML}
                </ul>
            <h3>More about this restaurant:</h3>
                <ul>
                    ${attributesHTML}
                </ul>
            <h2>Not interested in this restaurant?</h2>
            <p>Click below to fetch a different restaurant using the same search criteria</p>
            <button type="button" id="display-different-r" class="display-different-r js-display-different-r button">Spin again!</button>
        `);
        addMapHTML(latLong);
        handleSpinAgain();
        $(document).ready(() => {
            $('html, body').animate({
                scrollTop: $('.js-restaurant').offset().top - 50
            }, 'slow');
        });
    }

    function getFoodPhotoHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('photos')) {
            const photosHTMLArray = [];
            for (let group of restaurantInfo.photos.groups) {
                if (group.items.length > 1) {
                    photosHTMLArray.push(`
                        <img class="food-photo" src="${group.items[1].prefix}original${group.items[1].suffix}" alt="Restaurant photo.">
                    `);
                }
            }

            if (photosHTMLArray.length !== 0) {
                return photosHTMLArray.join('\r');
            }

            return '<p>Sorry, no photos of food available.</p>';
        }

        return '<p>Sorry, no photos of food available.</p>';
    }

    function getBestPhotoHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('bestPhoto')) {
            const prefix = restaurantInfo.bestPhoto.prefix;
            const suffix = restaurantInfo.bestPhoto.suffix;
            return `<img src="${prefix}original${suffix}" alt="Restaurant photo." class="restaurant-best-photo">`;
        }

        return '<p>Sorry, no image available for this restaurant.</p>';
    }

    function getLatLong(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('location')) {
            const lat = restaurantInfo.location.lat;
            const lng = restaurantInfo.location.lng;
            return `${lat},${lng}`;
        }

        return false;
    }

    function getURLHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('canonicalUrl')) {
            return `<a href="${restaurantInfo.canonicalUrl}?ref=4MRDI4UFA2MFILISD0LH1WB2WZWQVP42WUECJQQ44HFPZUPV" 
                target="_blank">View Restaurant on Foursquare</a>`;
        }

        return '<p>Restaurant url not available.</p>';
    }

    function getPhoneNumber(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('contact')) {
            if (Object.keys(restaurantInfo.contact).includes('formattedPhone')) {
                return restaurantInfo.contact.formattedPhone;
            } else if (Object.keys(restaurantInfo.contact).includes('phone')) {
                return restaurantInfo.contact.phone;
            }

            return 'Phone number not available.';
        }

        return 'Phone number not available.';
    }

    function getAttributesHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('attributes')) {
            try {
                const attributesHTMLArray = [];
                for (let attributeObject of restaurantInfo.attributes.groups) {
                    for (let item of attributeObject.items) {
                        if (item.displayName === item.displayValue) {
                            attributesHTMLArray.push(`<li>${item.displayName}</li>`);    
                        } else {
                            attributesHTMLArray.push(`<li>${item.displayName}: ${item.displayValue}</li>`);
                        }
                    }
                }

                return attributesHTMLArray.join('\r');
            } catch (e) {
                console.log(e);
                return '<li>Sorry, no attributes available</li>';
            }
        }

        return '<li>Sorry, no attributes available</li>';
    }

    function getHoursHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('hours')) {
            try {
                const hoursHTMLArray = [];
                for (let object of restaurantInfo.hours.timeframes) {
                    const timesArray = [];
                    for (let time of object.open) {
                        timesArray.push(time.renderedTime);
                    }

                    hoursHTMLArray.push(`<li>${object.days}: ${timesArray.join(', ')}</li>`);
                }

                return hoursHTMLArray.join('\r');
            } catch(e) {
                console.log(e);
                return '<li>Sorry, hours not available</li>';
            }
        }

        return '<li>Sorry, hours not available</li>';
    }

    function getMenuHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('hasMenu')) {
            if (restaurantInfo.hasMenu) {
                return `<a href="${restaurantInfo.menu.url}?ref=4MRDI4UFA2MFILISD0LH1WB2WZWQVP42WUECJQQ44HFPZUPV" 
                    target="_blank">View Menu on Foursquare</a>`;
            }

            return '<p>Menu not available.</p>';
        }

        return '<p>Menu not available.</p>';
    }

    function getRestaurantRatingHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('rating')) {
            return `<p><b>Rating:</b> ${restaurantInfo.rating}</p>`;
        }

        return '<p>Rating not available.</p>';
    }

    function getPriceHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('price')) {
            switch (restaurantInfo.price.tier) {
                case 1:
                    return '<p>The average price per entrée is less than $10.</p>';
                case 2:
                    return '<p>The average price per entrée is $10-$20.</p>';
                case 3:
                    return '<p>The average price per entrée is $20-$30.</p>';
                case 4:
                    return '<p>The average price per entrée is more than $30.</p>';
            }
        }

        return '<p>Sorry, no info available on pricing.</p>';
    }

    function getCategoriesHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('categories')) {
            const categoriesHTMLArray = [];
            for (let categoryObject of restaurantInfo.categories) {
                categoriesHTMLArray.push(`<li>${categoryObject.name}</li>`);
            }

            return categoriesHTMLArray.join('\r');
        }

        return '<li>Sorry, no categories available</li>';
    }

    function getRestaurantAddressHTML(restaurantInfo, restaurantInfoKeys) {
        if (restaurantInfoKeys.includes('location')) {
            try {
                const addressHTMLArray = [];
                for (let line of restaurantInfo.location.formattedAddress) {
                    addressHTMLArray.push(`${line}`);
                }

                return `<address>${addressHTMLArray.join('<br>')}</address>`;
            } catch (e) {
                return '<p>Address not available.</p>';
            }
        }

        return '<p>Address not available.</p>';
    }

    // Sets event listener to button that loads a different random restaurant without performing a new search
    function handleSpinAgain() {
        $('.js-display-different-r').click(() => {
            $('.js-directions-container').remove();
            $('.js-restaurant').empty();
            $('.js-utensils').toggleClass('hidden');
            $('.js-restaurant').toggleClass('hidden');
            $(document).ready(() => {
                $('html, body').animate({
                    scrollTop: $('.js-utensils').offset().top - 50
                }, 'slow');
            });
            pickRestaurant();
        });
    }

    function addMapHTML(latLong) {
        if (latLong) {
            loadMap(latLong);
            loadDirectionsForm(latLong);
        } else {
            $('.js-map').append('<p>Sorry, map not available for this location.</p>');
            $('.js-restaurant').append('<p>Sorry, directions not available for this location.</p>');
        }
    }

    // Adds Mapbox to DOM with marker set to restaurant's location
    function loadMap(latLong) {
        // Loads map with focus on restaurant
        const centerCoordinates = latLong.split(",").map(num => parseFloat(num)).reverse();
        mapboxgl.accessToken = 'pk.eyJ1IjoibGthcnBlciIsImEiOiJjazh1NzRhZzMwN3hwM2VwNG0xZnM3c2JqIn0.dD8wiLFpEkdBZOdZt7N6VA';
        const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: centerCoordinates,
            zoom: 15
        });

        // Adds control buttons to Mapbox
        map.addControl(new mapboxgl.NavigationControl());

        // Adds marker to map on location of restaurant
        const marker = new mapboxgl.Marker()
            .setLngLat(centerCoordinates)
            .addTo(map);
    }

    function loadDirectionsForm(latLong) {
        $('.js-restaurant').after(`
            <div id="directions-container" class="directions-container js-directions-container">
                <form id="directions-form" class="directions-form  js-directions-form">
                    <fieldset>
                        <legend>If you'd like directions, please provide an address for the point of departure</legend>
                        <div class="departure-container">
                            <label for="mode">Mode of travel:</label>
                            <select id="mode" class="js-mode">
                                <option value="fastest">Driving</option>
                                <option value="pedestrian">Walking</option>
                                <option value="bicycle">Cycling</option>
                            </select>
                            <label for="street">Street:</label>
                            <input type="text" id="street" name="street" class="js-street" required>
                            <label for="city">City:</label>
                            <input type="text" id="city" name="city" class="js-city" required>
                            <label for="state">State:</label>
                            <input type="text" id="state" name="state" class="js-state">
                        </div>
                    </fieldset>
                    <button type="submit" class="button">Find Directions</button>
                </form>
            </div>
        `);
        handleDirectionsForm(latLong);
    }

    function handleDirectionsForm(latLong) {
        $('.js-directions-form').submit(event => {
            event.preventDefault();
            $('.js-wheel').toggleClass('hidden');
            $(document).ready(() => {
                $('html, body').animate({
                    scrollTop: $('.js-wheel').offset().top - 50
                }, 'slow');
            });
            $('.js-directions').remove();
            $('.js-directions-container').append('<section class="directions js-directions" aria-live="polite"></section>');
            fetchDirections(latLong);
        });
    }

    // Fetch directions to restaurant from Mapquest API
    function fetchDirections(latLong) {
        const baseURL = 'https://www.mapquestapi.com/directions/v2/route?';
        const params = getDirectionsParams(latLong);
        fetch(`${baseURL}${params}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error(response.statusText);
                }
            })
            .then(responseJson => displayDirections(responseJson))
            .catch(error => {
                console.log("error", error);
                handleDirectionsAPIError();
            });
    }

    function handleDirectionsAPIError() {
        $('.js-wheel').toggleClass('hidden');
        $('.js-directions').append(`
            <h2>Error:</h2>
            <p>Looks like something went wrong while fetching directions.
            Please wait a few seconds, check your input for typos, and try again.</p>
        `);
        $(document).ready(() => {
            $('html, body').animate({
                scrollTop: $('.js-directions').offset().top - 50
            }, 'slow');
        });
    }

    function displayDirections(data) {
        $('.js-wheel').toggleClass('hidden');
        if (data.info.statuscode !== 0) {
            $('.js-directions').html(`
                <h2>Error:</h2>
                <p>Unable to find directions from the location you entered.</p>
                <p>Please check your input for typos and be sure to enter a valid address.</p>
            `);
            $(document).ready(() => {
                $('html, body').animate({
                    scrollTop: $('.js-directions').offset().top  - 50
                }, 'slow');
            });
        } else {
            const copyrightText = '© 2019 MapQuest, Inc.';
            const logoURL = 'https://api.mqcdn.com/res/mqlogo.gif';
            const imageAltText = '© 2019 MapQuest, Inc.';
            const totalDistance = roundNumber(data.route.distance, 0.25);
            const totalTime = roundNumber(data.route.realTime / 60, 1);
            const legs = data.route.legs;
            const directionsHTML = getDirectionsHTML(legs);
            $('.js-directions').html(`
                <h2>Directions</h2>
                <p><b>Length of journey:</b> ${totalDistance} mi.</p>
                <p><b>Estimated time to reach destination:</b> ${totalTime} min.</p>
                <ol>
                    ${directionsHTML}
                </ol>
                <p><img src="${logoURL}" alt="${imageAltText}."> ${copyrightText}</p>
                <p class="mapquest-terms-1">Use of directions and maps is subject to the <a href="https://hello.mapquest.com/terms-of-use/" 
                target="_blank">MapQuest Terms of Use</a>.</p>
                <p class="mapquest-terms-2">We make no guarantee of the accuracy of their content, road conditions or route usability. 
                You assume all risk of use.</p>
            `);
            $(document).ready(() => {
                $('html, body').animate({
                    scrollTop: $('.js-directions').offset().top  - 50
                }, 'slow');
            });
        }
    }

    function getDirectionsHTML(legs) {
        const directionsHTMLArray = [];
        for (let leg of legs) {
            for (let i = 0; i < leg.maneuvers.length; i++) {
                if (i < leg.maneuvers.length - 1) {
                    const mapURL = encodeURI(getDirectionsStepMapURL(`https${leg.maneuvers[i].mapUrl.slice(4)}`));
                    directionsHTMLArray.push(`
                        <li>
                            <p><img src="https${leg.maneuvers[i].iconUrl.slice(4)}" alt="Route maneuver."> 
                            ${leg.maneuvers[i].narrative}</p>
                            <img src="${mapURL}" alt="Map of maneuver number ${i + 1} of route." class="route-map-maneuver">
                            <p>After you travel approximately ${formatDistance(leg.maneuvers[i].distance)} 
                            and after about ${formatTime(leg.maneuvers[i].time)}:</p> 
                        </li>
                    `);
                } else {
                    directionsHTMLArray.push(`
                        <li>
                            <p><img src="https${leg.maneuvers[i].iconUrl.slice(4)}" alt="Route maneuver."> 
                            ${leg.maneuvers[i].narrative}</p>
                            <p>You will have reached your destination.</p> 
                        </li>
                    `);
                }
            }
        }

        return directionsHTMLArray.join('\r');
    }

    // Edits the zoom level and bounds of default route maneuver maps returned by API to improve legibility
    function getDirectionsStepMapURL(mapBaseURL) {
        const marker1Coordinates = mapBaseURL.split(/(locations=|\|marker|\|\|)/g)[2].split(",").map(num => parseFloat(num));
        const marker2Coordinates = mapBaseURL.split(/(locations=|\|marker|\|\|)/g)[6].split(",").map(num => parseFloat(num));
        let bounds;
        if (marker1Coordinates[0] > marker2Coordinates[0] && marker1Coordinates[1] > marker2Coordinates[1]) {
            bounds = `${marker1Coordinates[0]},${marker2Coordinates[1]},${marker2Coordinates[0]},${marker1Coordinates[1]}`;
        }

        if (marker1Coordinates[0] > marker2Coordinates[0] && marker1Coordinates[1] < marker2Coordinates[1]) {
            bounds = `${marker1Coordinates[0]},${marker1Coordinates[1]},${marker2Coordinates[0]},${marker2Coordinates[1]}`;
        }

        if (marker1Coordinates[0] < marker2Coordinates[0] && marker1Coordinates[1] < marker2Coordinates[1]) {
            bounds = `${marker2Coordinates[0]},${marker1Coordinates[1]},${marker1Coordinates[0]},${marker2Coordinates[1]}`;
        }

        if (marker1Coordinates[0] < marker2Coordinates[0] && marker1Coordinates[1] > marker2Coordinates[1]) {
            bounds = `${marker2Coordinates[0]},${marker2Coordinates[1]},${marker1Coordinates[0]},${marker1Coordinates[1]}`;
        }

        // Handle edge cases where only one marker is present on mapBaseURL, in which case bounds = undefined
        if (bounds) {
            return `${mapBaseURL.replace(/&center.+&d/g, `&boundingBox=${bounds}&d`)}&margin=20`;
        }
        
        return mapBaseURL;
    }

    function formatTime(seconds) {
        if (seconds < 5) {
            return `${seconds} sec.`;
        } else if (seconds >= 5 && seconds < 60) {
            const sec = roundNumber(seconds, 5);
            if (sec === 60) {
                return '1 min.';
            }

            return `${sec} sec.`;
        }

        const min = parseInt(seconds / 60);
        const sec = roundNumber(seconds % 60, 15);
        if (sec === 0) {
            return `${min} min.`
        } 
        
        if (sec === 60) {
            return `${min + 1} min.`
        }

        return `${min} min. and ${sec} sec.`;
    }

    function formatDistance(miles) {
        if (miles < 0.25) {
            return `${roundNumber(miles * 5280, 1)} ft.`;
        }

        return `${roundNumber(miles, 0.25)} mi.`;
    }

    function roundNumber(x, precision) {
        let y = x + (precision / 2);
        return y - (y % precision);
    }

    function getRouteType() {
        if ($('.js-mode').val()) {
            return $('.js-mode').val();
        }
        
        return 'fastest';
    }

    function getDeparturePoint() {
        if ($('.js-street').val()) {
            const street = $('.js-street').val();
            const city = $('.js-city').val();
            const state = $('.js-state').val();
            return `${street}, ${city}, ${state}`;
        }
        
        return $('.js-location').val();
    }

    function handleApp() {
        handleRestaurantForm();
        toggleToTop();
        returnToSearch();
    }

    $(handleApp);

})();
