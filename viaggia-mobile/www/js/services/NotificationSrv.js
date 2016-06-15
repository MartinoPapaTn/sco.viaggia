angular.module('viaggia.services.notification', [])


//
//A Service to work with notifications with server
//
.factory('notificationService', function ($q, $http, $rootScope, $ionicPlatform, Config) {

    var notificationService = {};
    //var numberNotification = 10;
    notificationService.getNotifications = function (sinceTimestamp, sincePosition, numberNotification) {
        var deferred = $q.defer();
        $http.get(Config.getMessagingServerURL() + '/app/public/notification/' + Config.getMessagingAppId() +
                '/?since=' + sinceTimestamp +
                '&position=' + sincePosition +
                '&count=' + numberNotification, Config.getHTTPConfig())
            .success(function (data) {
                deferred.resolve(data.notifications);
            })
            .error(function (err) {
                deferred.reject(err);

            });
        return deferred.promise;
    }

    // Register to GCM
    notificationService.register = function () {
        console.log("registration")
        var push = PushNotification.init({
            android: {
                senderID: Config.getSenderID(),
                topics: [Config.getMessagingAppId()]
            },
            ios: {
                alert: "true",
                badge: "true",
                sound: "true",
                senderID: Config.getSenderID(),
                topics: [Config.getMessagingAppId()]
            },
            windows: {}
        });

        push.on('registration', function (data) {
            //alert('registration' + JSON.stringify(data));
            console.log('registration' + JSON.stringify(data));


        });
        //What to do when I get a notification
        push.on('notification', function (data) {
            //alert("notification" + JSON.stringify(data));
            console.log("notification" + JSON.stringify(data));
            var lastTimeUpdate = new Date(localStorage.getItem(Config.getAppId() + '_lastUpdateTime'));
            console.log('received');
            $rootScope.countNotification = $rootScope.countNotification + 1;
            //alert("number of notification" + JSON.stringify($rootScope.countNotification));
            updateNotifications(lastTimeUpdate);
        });


        //...and in case of erro
        push.on('error', function (e) {
            //            alert('error' + e.message);
            console.log('error' + e.message)

        });




    }

    var getNotificationDetail = function () {}

    //get the last notification since last update
    var updateNotifications = function (lastTimeUpdate) {
        $http.get(Config.getMessagingServerURL() + '/app/public/notification/' + Config.getMessagingAppId() +
                '/?since=' + lastTimeUpdate.getTime() +
                '&position=' + 0 +
                '&count=' + numberNotification, Config.getHTTPConfig())
            .success(function (data) {
                if (data.notifications) {
                    var lastUpdateTime = new Date(data.notifications[0].updateTime);
                    localStorage.setItem(Config.getAppId() + '_lastUpdateTime', lastUpdateTime);
                    //update the local notifications and not readed index
                    localStorage.setItem(Config.getAppId() + '_notifications', JSON.stringify(data.notifications));
                }
                console.log('updated');
            })
            .error(function (err) {


            });
    }
    return notificationService;
})

.factory('feedService', function ($q, $rootScope, $http) {
    var cache = [];

    var load = function (url, feedKey, forceLoad) {
        var deferred = $q.defer();

        var oldTimestamp = localStorage['timestamp_' + feedKey];
        if (!forceLoad && oldTimestamp && new Date().getTime() - 10 * 60 * 1000 < oldTimestamp) {
            if (cache.length > 0) deferred.resolve(cache);
            else {
                deferred.resolve(cache = JSON.parse(localStorage['entries_' + feedKey]));
            }
        } else {
            $http.jsonp('https://ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=50&callback=JSON_CALLBACK&q=' + encodeURIComponent(url))
                .success(function (data) {
                    var res = data.responseData.feed.entries;
                    localStorage['entries_' + feedKey] = JSON.stringify(res);
                    localStorage['timestamp_' + feedKey] = new Date().getTime();
                    cache = res;
                    deferred.resolve(res);
                })
                .error(function (data) {
                    console.log("ERROR: " + data);
                    if (localStorage['entries_' + feedKey]) {
                        var res = JSON.parse(localStorage['entries_' + feedKey]);
                        cache = res;
                        deferred.resolve(res);
                    }
                    deferred.resolve([]);
                });
        }

        return deferred.promise;
    };

    var getByIdx = function (idx, url, feedKey) {
        var deferred = $q.defer();
        load(url, feedKey).then(function (data) {
            if (data.length > idx) deferred.resolve(data[idx]);
            return null;
        });
        return deferred.promise;
    };

    return {
        load: load,
        getByIdx: getByIdx
    }
});;
