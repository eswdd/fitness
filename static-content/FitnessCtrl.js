/*
 * Responsible for the main app, providing config and model<-> hash
 * functionality for the other controllers
 */
fitness
    .controller('FitnessCtrl', [ '$rootScope', '$scope', '$location', '$route', '$routeParams', function FitnessCtrl($rootScope, $scope, $location, $route, $routeParams) {
        $rootScope.showPage = function(page) {
            $location.path(page);
        }
    }])
    .config(function($routeProvider, $locationProvider) {
        var workoutParams = {
            templateUrl: 'workout.html',
            controller: 'WorkoutCtrl'
        }
        var historyParams = {
            templateUrl: 'history.html',
            controller: 'HistoryCtrl'
        }
        $routeProvider.when('/workout/:workoutId', workoutParams)
                      .when('/workout', workoutParams) 
                      .when('/history', historyParams)
                      .otherwise(historyParams);
    })