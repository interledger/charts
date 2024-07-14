package test

import (
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/helm"
	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/stretchr/testify/require"
)

func TestHelmBasicExampleDeployment(t *testing.T) {
	t.Parallel()

	helmChartPath, err := filepath.Abs("../../rafiki-auth")
	require.NoError(t, err)

	namespaceName := fmt.Sprintf("rafiki-auth-%s", strings.ToLower(random.UniqueId()))
	releaseName := namespaceName

	kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)

	k8s.CreateNamespace(t, kubectlOptions, namespaceName)
	defer k8s.DeleteNamespace(t, kubectlOptions, namespaceName)

	options := &helm.Options{
		KubectlOptions: kubectlOptions,
	}

	helm.Install(t, options, helmChartPath, releaseName)
	defer helm.Delete(t, options, releaseName, true)

	deploymentName := fmt.Sprintf("%s", releaseName)

	k8s.WaitUntilDeploymentAvailable(t, kubectlOptions, deploymentName, 20, 1*time.Second)

	deployment := k8s.GetDeployment(t, kubectlOptions, deploymentName)

	require.Equal(t, deployment.Name, deploymentName)
}
